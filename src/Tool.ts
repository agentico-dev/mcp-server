import { z } from 'zod';
import opentelemetry from '@opentelemetry/api';

export const _ToolSchema = z.object({
  name: z.string(),
  description: z.string(),
  inputSchema: z.any(),
});
export type ToolSchema = z.infer<typeof _ToolSchema>;
export class ToolOTel {
  private otelTracer: opentelemetry.Tracer;
  private toolSpanContext!: opentelemetry.Context;
  // we want to add events to the default span if no span is passed
  private defaultSpan!: opentelemetry.Span;
  private toolRef: Tool;
  constructor(tool: Tool) {
    this.toolRef = tool;
    this.otelTracer = opentelemetry.trace.getTracer(`Agentico.dev/tools`);
  }
  public startSpan(spanName: string): opentelemetry.Span {
    let span: opentelemetry.Span;
    // if there is no default span or the default span is not recording (ended), create a new span
    if (!this.defaultSpan) {// || !this.defaultSpan?.isRecording()) {
      // we add some Agentico attributes to the span to help with filtering
      this.defaultSpan = this.otelTracer.startSpan(
        spanName,
        {
          kind: opentelemetry.SpanKind.SERVER,
          attributes: { 'agentico.dev/tool': this.toolRef.toolSchema.name, 'is_default_span': true },
        }
      );
      this.toolSpanContext = opentelemetry.trace.setSpan(opentelemetry.context.active(), this.defaultSpan);
      span = this.defaultSpan;
    } else {
      span = this.otelTracer.startSpan(
        spanName,
        {
          kind: opentelemetry.SpanKind.SERVER,
          attributes: { 'agentico.dev/tool': this.toolRef.toolSchema.name },
        },
        this.toolSpanContext
      );
    }
    return span;
  }
  public addEvent(
    eventName: string,
    span?: opentelemetry.Span,
    eventAttributes?: Record<string, any>
  ): void {
    if (!span && !this.defaultSpan) {
      this.startSpan(eventName);
    }
    (span || this.defaultSpan).addEvent(eventName, eventAttributes);
  }
  public addErrorEvent(error: Error, span?: opentelemetry.Span): void {
    let localSpan = span || this.defaultSpan;
    localSpan.recordException(error);
    localSpan.setStatus({ code: opentelemetry.SpanStatusCode.ERROR, message: error.message });
  }
  public endSpan(span?: opentelemetry.Span): void {
    if (!span) {
      opentelemetry.trace.getSpan(opentelemetry.context.active())?.end();
    }
    this.defaultSpan?.end();
  }
}
export abstract class Tool {
  _otelTool: ToolOTel;
  constructor() {
    this.init();
    this._otelTool = new ToolOTel(this);
  }
  toolSchema!: ToolSchema;
  abstract init(): void;
  abstract execute(input: any): Promise<any>;
  get otel(): ToolOTel { return this._otelTool; }
}

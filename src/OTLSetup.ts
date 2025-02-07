import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { HttpInstrumentation } from '@opentelemetry/instrumentation-http';
import { ExpressInstrumentation } from '@opentelemetry/instrumentation-express';
import { FsInstrumentation } from '@opentelemetry/instrumentation-fs';
import { Resource } from '@opentelemetry/resources';
import { 
  ATTR_SERVICE_NAME, 
  ATTR_SERVICE_VERSION,
  ATTR_OTEL_SCOPE_NAME,
  ATTR_OTEL_SCOPE_VERSION
} from '@opentelemetry/semantic-conventions';
import path from 'path';
import fs from 'fs';

// Initialize OpenTelemetry SDK
// @todo - would it be good to add AI Workflows for Scope instead? Both? Hybrid?
// for now, focus on Tools, but in the future I may want to add AI Workflows, and agents!! 🤖
const otelSDK = function(
    exporterUrl: string = 'http://localhost:4318/v1/traces',
    toolName: string,
    toolVersion: string) {
  const traceExporter = new OTLPTraceExporter({
    url: exporterUrl
  });
  const __dirname = path.dirname(new URL(import.meta.url).pathname);
  const packageJsonPath = path.resolve(__dirname, '../package.json');
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  const resource = new Resource({
    [ ATTR_SERVICE_NAME ]: "Agentico.dev",
    [ ATTR_SERVICE_VERSION ]: packageJson.version,
    [ ATTR_OTEL_SCOPE_NAME ]: toolName,
    [ ATTR_OTEL_SCOPE_VERSION ]: toolVersion
  });
  return new NodeSDK({
    traceExporter,
    resource,
    instrumentations: [
      new HttpInstrumentation(),
      new ExpressInstrumentation(),
      new FsInstrumentation(),
      getNodeAutoInstrumentations(),
    ],
  });
}

export { otelSDK };
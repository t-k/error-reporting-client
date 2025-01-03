import type {
  ErrorContext,
  RequestBody,
  SourceLocation,
  SourceReference,
  Stack,
} from "./type";
import type { RawSourceMap } from "source-map-js";

class ErrorReporting {
  private readonly projectId: string;
  private readonly apiKey: string;
  private readonly service: string;
  private readonly version: string | undefined;
  private readonly reportUncaughtExceptions: boolean;
  private readonly reportUnhandledPromiseRejections: boolean;
  private readonly sourceReferences: SourceReference[] = [];
  private user: string | undefined;
  private disabled = false;
  private sourceMaps: { [key: string]: RawSourceMap } = {};

  constructor({
    projectId,
    apiKey,
    service,
    version,
    reportUncaughtExceptions,
    reportUnhandledPromiseRejections,
    sourceReferences,
  }: {
    projectId: string;
    apiKey: string;
    service?: string;
    version?: string;
    reportUncaughtExceptions?: boolean;
    reportUnhandledPromiseRejections?: boolean;
    sourceReferences?: SourceReference[];
  }) {
    this.projectId = projectId;
    this.apiKey = apiKey;
    this.service = service ?? "web";
    this.version = version;
    this.reportUncaughtExceptions = reportUncaughtExceptions ?? true;
    this.reportUnhandledPromiseRejections =
      reportUnhandledPromiseRejections ?? true;
    this.sourceReferences = sourceReferences ?? [];
  }

  public setUser(user: string | undefined) {
    this.user = user;
  }

  public disable() {
    this.disabled = true;
  }

  public enable() {
    this.disabled = false;
  }

  public registerHandler() {
    // Register as global error handler if requested
    const noop = () => {};
    if (this.reportUncaughtExceptions) {
      const oldErrorHandler = window.onerror || noop;

      window.onerror = (message, source, lineno, colno, error) => {
        if (error) {
          this.sendError(error).catch(noop);
        }
        oldErrorHandler(message, source, lineno, colno, error);
        return true;
      };
    }
    if (this.reportUnhandledPromiseRejections) {
      const oldPromiseRejectionHandler = window.onunhandledrejection || noop;
      window.onunhandledrejection = (promiseRejectionEvent) => {
        if (promiseRejectionEvent) {
          this.sendError(promiseRejectionEvent.reason).catch(noop);
        }
        oldPromiseRejectionHandler.call(window, promiseRejectionEvent);
        return true;
      };
    }
  }

  public async sendError(err: Error | string, reportLocation?: SourceLocation) {
    if (this.disabled) {
      return;
    }
    const userAgent = window.navigator.userAgent;
    const url = window.location.href;
    let error: Error;
    if (typeof err === "string" || err instanceof String) {
      // Transform the message in an error, use try/catch to make sure the stacktrace is populated.
      try {
        throw new Error(`${err}`);
      } catch (e: unknown) {
        error = e as Error;
      }
      // the first frame when using report() is always this library
    } else {
      error = err;
    }
    const { firstLine, mappedStack } = await this.mapStackTrace(
      error.stack ?? "",
    );
    const location = this.getReportLocationFromStack(mappedStack);
    const context: ErrorContext = {
      httpRequest: {
        url,
        userAgent,
      },
      ...(this.user != null ? { user: `${this.user}` } : {}),
      ...(reportLocation != null
        ? { reportLocation }
        : location != null
          ? {
              reportLocation: location,
            }
          : {}),
      sourceReferences: this.sourceReferences,
    };
    const body: RequestBody = {
      serviceContext: {
        service: this.service,
        ...(this.version != null ? { version: this.version } : {}),
      },
      message: this.stackToString(firstLine ?? "", mappedStack),
      context,
    };
    return await this.sendErrorPayload(body);
  }

  private getReportLocationFromStack(
    mappedStack: Stack[],
  ): SourceLocation | undefined {
    if (mappedStack == null || mappedStack.length === 0) {
      return;
    }
    const firstFrame = mappedStack[0];
    return {
      filePath: firstFrame.uri,
      lineNumber: firstFrame.line,
      functionName: firstFrame.functionName,
    };
  }

  private stackToString(firstLine: string, mappedStack: Stack[]) {
    return [
      firstLine,
      ...mappedStack.map(
        (frame) =>
          `    at ${frame.functionName} (${frame.uri}:${frame.line}:${frame.column})`,
      ),
    ].join("\n");
  }

  private sendErrorPayload(body: RequestBody) {
    return fetch(this.buildUrl(), {
      method: "POST",
      headers: {
        "Content-Type": "application/json; charset=UTF-8",
      },
      body: JSON.stringify(body),
    })
      .then((response) => {
        if (response.ok) {
          return { message: body.message };
        }
        if (response.status === 429) {
          throw {
            message: "quota or rate limiting error on stackdriver report",
            name: "Http429FakeError",
          };
        }
        throw new Error(
          `${response.status} http response on stackdriver report`,
        );
      })
      .catch((error) => {
        throw error;
      });
  }

  private buildUrl() {
    return `https://clouderrorreporting.googleapis.com/v1beta1/projects/${this.projectId}/events:report?key=${this.apiKey}` as const;
  }

  // implemented the following function with reference to the following URL.
  // https://stackoverflow.com/questions/75400967/get-stack-trace-as-a-string-when-using-source-map/77158517#77158517
  private async getSourceMapFromUri(uri: string) {
    if (this.sourceMaps[uri] != null) {
      return this.sourceMaps[uri];
    }
    const uriQuery = new URL(uri).search;
    const currentScriptContent = await (await fetch(uri)).text();

    const match = RegExp(/\/\/# sourceMappingURL=(.*)/).exec(
      currentScriptContent,
    );
    if (!match) {
      throw new Error("sourceMappingURL not found in script content");
    }
    let mapUri = match[1];
    mapUri = new URL(mapUri, uri).href + uriQuery;

    const map = await (await fetch(mapUri)).json();

    this.sourceMaps[uri] = map;

    return map;
  }

  private async mapStackTrace(stack: string) {
    const stackLines = stack.split("\n");
    // Remove the first line which is the error message
    const firstLine = stackLines.shift();

    const mappedStack: Stack[] = [];

    for (const line of stackLines) {
      const match = RegExp(/(.*)(https?:\/\/.*):(\d+):(\d+)/).exec(line);
      if (match == null) {
        continue;
      }

      const functionName = match[1].replace("at", "").replace("(", "").trim();
      const uri = match[2];
      try {
        const SourceMapConsumer = await this.getSourceMapConsumer();
        const consumer = new SourceMapConsumer(
          await this.getSourceMapFromUri(uri),
        );

        const originalPosition = consumer.originalPositionFor({
          line: Number.parseInt(match[3]),
          column: Number.parseInt(match[4]),
        });
        if (
          originalPosition.source == null ||
          originalPosition.line == null ||
          originalPosition.column == null
        ) {
          mappedStack.push({
            functionName,
            uri,
            line: Number.parseInt(match[3]),
            column: Number.parseInt(match[4]),
          });
          continue;
        }
        mappedStack.push({
          functionName,
          uri: originalPosition.source,
          line: originalPosition.line,
          column: originalPosition.column + 1,
        });
      } catch (error) {
        // If the source map is not found, use the original stack trace
        mappedStack.push({
          functionName,
          uri,
          line: Number.parseInt(match[3]),
          column: Number.parseInt(match[4]),
        });
      }
    }
    return { firstLine, mappedStack };
  }

  private async getSourceMapConsumer() {
    return (await import("source-map-js")).SourceMapConsumer;
  }
}

export default ErrorReporting;

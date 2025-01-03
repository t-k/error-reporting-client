import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  type MockInstance,
  vi,
} from "vitest";
import ErrorReporting from "./index";

describe("ErrorReporting", () => {
  const projectId = "test-project-id";
  const apiKey = "test-api-key";
  const service = "test-service";
  const version = "1.0.0";
  let mockedFetch: MockInstance;
  beforeEach(async () => {
    mockedFetch = vi
      .spyOn(window, "fetch")
      .mockImplementation(
        async () => new Response('{ "key": "value" }', { status: 200 }),
      );
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should set user", () => {
    const user = "test-user";
    const errorReporting = new ErrorReporting({
      projectId,
      apiKey,
      service,
      version,
    });
    errorReporting.setUser(user);
    expect((errorReporting as any).user).toBe(user);
  });
  describe("with location", () => {
    it("should send error", async () => {
      const errorReporting = new ErrorReporting({
        projectId,
        apiKey,
        service,
        version,
      });
      try {
        throw new Error("test error");
      } catch (error) {
        await errorReporting.sendError(error as Error, {
          filePath: "./src/index.test.ts",
          lineNumber: 53,
          functionName: "test",
        });
      }
      expect(mockedFetch).toHaveBeenCalled();
      expect(mockedFetch).toHaveBeenCalledWith(
        "https://clouderrorreporting.googleapis.com/v1beta1/projects/test-project-id/events:report?key=test-api-key",
        expect.objectContaining({
          method: "POST",
          headers: {
            "Content-Type": "application/json; charset=UTF-8",
          },
          body: expect.stringMatching(
            /^{"serviceContext":{"service":"test-service","version":"1.0.0"},"message":"Error: test error\\n {4}at file.+filePath":"\.\/src\/index\.test.ts","lineNumber":53,"functionName":"test"},"sourceReferences":\[\]}}$/,
          ),
        }),
      );
    });
  });
  describe("setUser", () => {
    it("should send error", async () => {
      const errorReporting = new ErrorReporting({
        projectId,
        apiKey,
        service,
        version,
      });
      const user = "test-user";
      errorReporting.setUser(user);
      try {
        throw new Error("test error");
      } catch (error) {
        await errorReporting.sendError(error as Error);
      }
      expect(mockedFetch).toHaveBeenCalled();
      expect(mockedFetch).toHaveBeenCalledWith(
        "https://clouderrorreporting.googleapis.com/v1beta1/projects/test-project-id/events:report?key=test-api-key",
        expect.objectContaining({
          method: "POST",
          headers: {
            "Content-Type": "application/json; charset=UTF-8",
          },
          body: expect.stringMatching(/"user":"test-user"/),
        }),
      );
    });
  });
});

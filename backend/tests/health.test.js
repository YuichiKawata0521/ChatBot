import request from "supertest";
import app from "../src/app.js";

describe("Health check API", () => {

  test("GET /api/health returns 200", async () => {

    const res = await request(app).get("/api/health");

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);

  });

});
import { readContent, json, failure } from "@/lib/server";
export async function GET() {
  try {
    return json(await readContent());
  } catch (e) {
    return failure(e);
  }
}

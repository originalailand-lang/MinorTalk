// app/api/env/route.ts
export async function GET() {
  const urlSet = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const keySet = Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

  // 실제 값은 노출하지 않고, 존재 여부만 알려줌
  return Response.json({ urlSet, keySet });
}

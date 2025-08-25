"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../lib/supabaseClient";
import type { SupabaseClient } from "@supabase/supabase-js";

type RankItem = { id: string; name: string; count: number };

export default function HomePage() {
  // ✅ 바깥에서만 env 가드 (훅 호출 전)
  if (!supabase) {
    return (
      <main className="min-h-screen p-6">
        <h1 className="text-xl font-semibold">환경 설정이 필요합니다</h1>
        <p className="mt-2 opacity-70">
          <code>NEXT_PUBLIC_SUPABASE_URL</code> / <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code> 를
          .env.local 및 Vercel(Production)에 추가 후 Redeploy 하세요.
        </p>
        <p className="mt-2 text-sm">
          상태 확인: <a className="underline" href="/api/env">/api/env</a>
        </p>
      </main>
    );
  }
  // ✅ supabase 확정 후 내부 컴포넌트 렌더 (훅은 내부에서만 호출)
  return <HomeInner sb={supabase} />;
}

function HomeInner({ sb }: { sb: SupabaseClient }) {
  const router = useRouter();

  // 인증 상태
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [isAuthed, setIsAuthed] = useState(false);
  const [displayName, setDisplayName] = useState<string | null>(null);

  // 방 검색
  const [keyword, setKeyword] = useState("");
  const normalized = useMemo(() => keyword.normalize("NFC").trim(), [keyword]);
  const [searchBusy, setSearchBusy] = useState(false);

  // 랭킹
  const [ranking, setRanking] = useState<RankItem[]>([]);
  const [rankBusy, setRankBusy] = useState(false);

  useEffect(() => {
    const run = async () => {
      const { data } = await sb.auth.getSession();
      const user = data.session?.user ?? null;
      setIsAuthed(Boolean(user));
      const dn =
        (user?.user_metadata as { display_name?: string } | undefined)?.display_name ?? null;
      setDisplayName(dn);
      setLoadingAuth(false);
    };
    run();
  }, [sb]);

  useEffect(() => {
    const loadRanking = async () => {
      setRankBusy(true);
      const { data: rooms, error } = await sb.from("rooms").select("id,name");
      if (error || !rooms) {
        setRanking([]);
        setRankBusy(false);
        return;
      }

      const results: RankItem[] = [];
      for (const r of rooms) {
        const { count } = await sb
          .from("messages")
          .select("id", { count: "exact", head: true })
          .eq("room_id", r.id);
        results.push({ id: r.id, name: r.name, count: count ?? 0 });
      }
      results.sort((a, b) => b.count - a.count);
      setRanking(results.slice(0, 10));
      setRankBusy(false);
    };
    loadRanking();
  }, [sb]);

  const goToRoom = async () => {
    if (!normalized) return;
    setSearchBusy(true);

    const { data: found, error: findErr } = await sb
      .from("rooms")
      .select("id, name")
      .eq("name", normalized)
      .maybeSingle();

    let roomId = found?.id as string | undefined;

    if (!findErr && !roomId) {
      const { data: created, error: createErr } = await sb
        .from("rooms")
        .insert({ name: normalized })
        .select("id")
        .single();
      if (createErr) {
        alert(createErr.message);
        setSearchBusy(false);
        return;
      }
      roomId = created!.id;
    }

    setSearchBusy(false);
    router.push(`/chat?room=${encodeURIComponent(roomId!)}`);
  };

  return (
    <main className="min-h-screen p-6">
      {/* 헤더 (15%) */}
      <header className="flex items-center justify-between h-[15vh]">
        <Link href="/" className="text-2xl font-bold">
          Minor Talk
        </Link>
        <nav className="flex gap-3">
          {loadingAuth ? (
            <span>…</span>
          ) : isAuthed ? (
            <>
              <span className="opacity-70 text-sm">
                안녕하세요{displayName ? `, ${displayName}` : "!"}
              </span>
              <Link href="/chat" className="underline">
                채팅 들어가기
              </Link>
            </>
          ) : (
            <>
              <Link href="/auth/signin" className="underline">
                로그인
              </Link>
              <Link href="/auth/signup" className="underline">
                회원가입
              </Link>
            </>
          )}
        </nav>
      </header>

      {/* 검색 (25%) */}
      <section className="h-[25vh] flex flex-col items-center justify-center gap-3">
        <h1 className="text-3xl font-extrabold">방 이름으로 바로 입장</h1>
        <div className="w-full max-w-xl flex gap-2">
          <input
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            className="flex-1 border p-3 rounded"
            placeholder="예: general, 개발, 영화토론"
            onKeyDown={(e) => e.key === "Enter" && goToRoom()}
          />
          <button
            disabled={!normalized || searchBusy}
            onClick={goToRoom}
            className="border px-4 rounded"
          >
            {searchBusy ? "입장 중…" : "입장"}
          </button>
        </div>
      </section>

      {/* 광고/프로모 (20%) */}
      <section className="h-[20vh] grid place-items-center border rounded">
        광고/프로모 영역
      </section>

      {/* 랭킹 (40%) */}
      <section className="mt-6">
        <h2 className="font-semibold mb-2">지금 인기 방 TOP 10</h2>
        <div className="h-[40vh] overflow-y-auto border rounded">
          {rankBusy ? (
            <div className="p-4 opacity-70">랭킹 불러오는 중…</div>
          ) : ranking.length === 0 ? (
            <div className="p-4 opacity-70">아직 생성된 방이 없어요.</div>
          ) : (
            <ol>
              {ranking.map((r, i) => (
                <li key={r.id} className="p-3 flex justify-between border-b">
                  <button
                    onClick={() =>
                      router.push(`/chat?room=${encodeURIComponent(r.id)}`)
                    }
                    className="underline"
                  >
                    {i + 1}. {r.name}
                  </button>
                  <span className="opacity-70 text-sm">메시지 {r.count}</span>
                </li>
              ))}
            </ol>
          )}
        </div>
      </section>
    </main>
  );
}

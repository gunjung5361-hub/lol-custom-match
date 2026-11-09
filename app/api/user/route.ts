import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(request: Request) {
  const { gameName, tagLine } = await request.json();
  const apiKey = process.env.RIOT_API_KEY;

  // 라이엇 계정 API로 PUUID 조회 (한국 서버 기준)
  const riotRes = await fetch(
    `https://asia.api.riotgames.com/riot/account/v1/accounts/by-riot-id/${encodeURIComponent(gameName)}/${encodeURIComponent(tagLine)}`,
    { headers: { 'X-Riot-Token': apiKey! } }
  );

  if (!riotRes.ok) return NextResponse.json({ error: '소환사를 찾을 수 없습니다.' }, { status: 400 });
  const accountData = await riotRes.json();

  // DB에 멤버 저장
  const { error } = await supabase.from('users').insert({
    game_name: gameName,
    tag_line: tagLine,
    puuid: accountData.puuid
  });

  if (error) return NextResponse.json({ error: '이미 등록되었거나 DB 오류입니다.' }, { status: 400 });

  return NextResponse.json({ success: true, gameName, tagLine });
}
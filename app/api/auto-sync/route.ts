import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function GET() {
  const apiKey = process.env.RIOT_API_KEY;

  // 1. 등록된 내전 멤버 PUUID 가져오기
  const { data: users } = await supabase.from('users').select('puuid');
  if (!users || users.length === 0) {
    return NextResponse.json({ error: '등록된 내전 멤버가 없습니다.' }, { status: 400 });
  }

  const memberPuuids = users.map((u) => u.puuid);
  let newMatchesCount = 0;

  // 2. 멤버별 최근 매치 ID 조회 (최근 3판씩만 탐색)
  for (const user of users) {
    const matchRes = await fetch(
      `https://asia.api.riotgames.com/lol/match/v5/matches/by-puuid/${user.puuid}/ids?start=0&count=3`,
      { headers: { 'X-Riot-Token': apiKey! } }
    );
    if (!matchRes.ok) continue;
    const matchIds: string[] = await matchRes.json();

    for (const matchId of matchIds) {
      // 이미 수집한 경기는 넘어가기
      const { data: existing } = await supabase
        .from('matches')
        .select('match_id')
        .eq('match_id', matchId)
        .single();
      if (existing) continue;

      // 매치 상세 정보 확인
      const detailRes = await fetch(`https://asia.api.riotgames.com/lol/match/v5/matches/${matchId}`, {
        headers: { 'X-Riot-Token': apiKey! }
      });
      if (!detailRes.ok) continue;
      const matchData = await detailRes.json();

      // 사용자 설정 게임(queueId 0) 및 내전 멤버 4명 이상 포함 여부 체크
      if (matchData.info.queueId !== 0) continue;
      const participants = matchData.info.participants;
      const ourMemberCount = participants.filter((p: any) => memberPuuids.includes(p.puuid)).length;

      if (ourMemberCount >= 4) {
        await supabase.from('matches').insert({
          match_id: matchId,
          game_creation: matchData.info.gameCreation,
          win_team: matchData.info.teams[0].win ? 'BLUE' : 'RED'
        });
        newMatchesCount++;
      }
    }
  }

  return NextResponse.json({ success: true, addedMatches: newMatchesCount });
}
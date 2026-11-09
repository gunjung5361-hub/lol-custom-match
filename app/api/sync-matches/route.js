import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Supabase 클라이언트 연결 설정
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

const RIOT_API_KEY = process.env.RIOT_API_KEY;

export async function GET(request) {
  try {
    // 1. Supabase에 등록된 모든 유저 목록 가져오기
    const { data: users, error: userError } = await supabase.from('users').select('*');
    if (userError) throw userError;

    if (!users || users.length === 0) {
      return NextResponse.json({ message: '등록된 유저가 없습니다.' }, { status: 400 });
    }

    let totalSyncedMatches = 0;

    // 2. 각 유저별로 라이엇 API에서 최근 매치 가져오기
    for (const user of users) {
      const puuid = user.puuid;
      
      // 라이엇 매치 리스트 API 호출 (큐 필터 없이 최근 20경기 조회)
      const matchUrl = `https://asia.api.riotgames.com/lol/match/v5/matches/by-puuid/${puuid}/ids?start=0&count=20&api_key=${RIOT_API_KEY}`;
      const matchRes = await fetch(matchUrl);
      
      if (!matchRes.ok) continue;
      const matchIds = await matchRes.json();

      // 3. 각 매치 상세 정보를 확인하여 DB에 저장
      for (const matchId of matchIds) {
        // 이미 DB에 있는 매치인지 확인
        const { data: existingMatch } = await supabase
          .from('matches')
          .select('match_id')
          .eq('match_id', matchId)
          .single();

        if (existingMatch) continue; // 이미 있으면 패스

        // 매치 상세 정보 가져오기
        const detailUrl = `https://asia.api.riotgames.com/lol/match/v5/matches/${matchId}?api_key=${RIOT_API_KEY}`;
        const detailRes = await fetch(detailUrl);
        if (!detailRes.ok) continue;
        
        const matchData = await detailRes.json();
        const queueId = matchData.info.queueId;

        // 0번(사용자 설정 게임/내전)인 경우에만 저장!
        if (queueId === 0) {
          const gameCreation = matchData.info.gameCreation;
          
          // DB에 매치 저장
          await supabase.from('matches').insert([
            { match_id: matchId, game_creation: gameCreation }
          ]);
          totalSyncedMatches++;
        }
      }
    }

    return NextResponse.json({ success: true, syncedCount: totalSyncedMatches });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
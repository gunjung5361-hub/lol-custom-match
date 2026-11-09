'use client';

import { useState } from 'react';

export default function Home() {
  const [gameName, setGameName] = useState('');
  const [tagLine, setTagLine] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  // 멤버 등록 함수
  const handleRegisterUser = async () => {
    setMessage('멤버 등록 중...');
    const res = await fetch('/api/user', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ gameName, tagLine })
    });
    const data = await res.json();
    if (res.ok) setMessage(`등록 완료: ${gameName}#${tagLine}`);
    else setMessage(`등록 실패: ${data.error}`);
  };

  // 전적 자동 수집 함수
  const handleAutoSync = async () => {
    setLoading(true);
    setMessage('내전 경기 탐색 중...');
    const res = await fetch('/api/auto-sync');
    const data = await res.json();
    setLoading(false);
    if (res.ok) setMessage(`완료! 새 경기 ${data.addedMatches}판을 수집했습니다.`);
    else setMessage(`수집 실패: ${data.error}`);
  };

  return (
    <main className="p-8 max-w-md mx-auto">
      <h1 className="text-2xl font-bold mb-6 text-center">🎮 우리들 전용 내전 통계</h1>

      {/* 1. 멤버 등록 구역 */}
      <div className="bg-gray-100 p-4 rounded-lg mb-6 dark:bg-gray-800">
        <h2 className="font-bold mb-2">1. 내전 멤버 등록 (최초 1회만)</h2>
        <div className="flex gap-2 mb-2">
          <input
            type="text"
            placeholder="닉네임 (예: Hide on bush)"
            value={gameName}
            onChange={(e) => setGameName(e.target.value)}
            className="border p-2 rounded flex-1 text-black"
          />
          <input
            type="text"
            placeholder="태그 (예: KR1)"
            value={tagLine}
            onChange={(e) => setTagLine(e.target.value)}
            className="border p-2 rounded w-24 text-black"
          />
        </div>
        <button onClick={handleRegisterUser} className="w-full bg-blue-600 text-white py-2 rounded font-semibold">
          멤버 추가
        </button>
      </div>

      {/* 2. 전적 가져오기 구역 */}
      <div className="bg-gray-100 p-4 rounded-lg dark:bg-gray-800">
        <h2 className="font-bold mb-2">2. 내전 전적 가져오기</h2>
        <button
          onClick={handleAutoSync}
          disabled={loading}
          className="w-full bg-green-600 hover:bg-green-700 text-white py-3 rounded font-bold disabled:bg-gray-400"
        >
          {loading ? '전적 가져오는 중...' : '🔄 끝난 내전 경기 불러오기'}
        </button>
      </div>

      {message && <p className="text-center font-bold text-sm mt-4 text-blue-500">{message}</p>}
    </main>
  );
}
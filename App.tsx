
import React, { useState, useEffect, useCallback } from 'react';
import GameCanvas from './components/GameCanvas';
import { GameState, GameStats, Difficulty, PlayerClass, Gender } from './types';
import { generateMissionBriefing, generateAfterActionReport } from './services/geminiService';
import { Play, RotateCcw, Shield, Crosshair, Users, Activity, MessageSquare, Target, Skull, Droplets, Zap, Wind, Bomb, Home, Pause, Swords, Cross, User } from 'lucide-react';

export default function App() {
  const [gameState, setGameState] = useState<GameState>(GameState.MENU);
  const [difficulty, setDifficulty] = useState<Difficulty>(Difficulty.NORMAL);
  const [playerClass, setPlayerClass] = useState<PlayerClass>(PlayerClass.ASSAULT);
  const [playerGender, setPlayerGender] = useState<Gender>(Gender.MALE);
  
  const [kills, setKills] = useState(0);
  const [currentHp, setCurrentHp] = useState(100);
  const [survivors, setSurvivors] = useState(99);
  const [sessionId, setSessionId] = useState(0); // Forcing GameCanvas reset

  // Skill Cooldowns
  const [dashCd, setDashCd] = useState(100);
  const [nadeCd, setNadeCd] = useState(100);
  
  // AI Content State
  const [missionData, setMissionData] = useState<{title: string, briefing: string} | null>(null);
  const [reportData, setReportData] = useState<{rank: string, comment: string} | null>(null);
  const [loadingAI, setLoadingAI] = useState(false);

  const difficultyLabels = {
    [Difficulty.EASY]: '新手',
    [Difficulty.NORMAL]: '高手',
    [Difficulty.HARD]: '传说'
  };

  const classInfo = {
    [PlayerClass.ASSAULT]: { name: '突击手', desc: '平衡型 - 快速连射', color: 'text-blue-400', border: 'border-blue-500', icon: <Swords size={24} /> },
    [PlayerClass.RUSHER]: { name: '冲锋手', desc: '高射速 - 低伤害 - 跑得快', color: 'text-yellow-400', border: 'border-yellow-500', icon: <Wind size={24} /> },
    [PlayerClass.SNIPER]: { name: '狙击手', desc: '超高伤害 - 射速慢', color: 'text-green-400', border: 'border-green-500', icon: <Crosshair size={24} /> },
    [PlayerClass.HEAVY]: { name: '重装兵', desc: '高血量 - 霰弹枪 - 移动慢', color: 'text-red-400', border: 'border-red-500', icon: <Shield size={24} /> },
  };

  // Load Mission Briefing on Mount
  useEffect(() => {
    const loadBriefing = async () => {
      setLoadingAI(true);
      const data = await generateMissionBriefing();
      setMissionData(data);
      setLoadingAI(false);
    };
    loadBriefing();
  }, []);

  // Listen for ESC key to toggle Pause
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (gameState === GameState.PLAYING) {
          setGameState(GameState.PAUSED);
        } else if (gameState === GameState.PAUSED) {
          setGameState(GameState.PLAYING);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gameState]);

  const handleStartGame = useCallback(() => {
    setSessionId(prev => prev + 1); // Increment ID to force full reset
    setGameState(GameState.PLAYING);
    setReportData(null);
  }, []);

  const handleResume = useCallback(() => {
    setGameState(GameState.PLAYING);
  }, []);

  const handleReturnHome = useCallback(() => {
    setGameState(GameState.MENU);
  }, []);

  const handleGameOver = useCallback(async (stats: GameStats) => {
    setGameState(GameState.GAME_OVER);
    setLoadingAI(true);
    const data = await generateAfterActionReport(stats);
    setReportData(data);
    setLoadingAI(false);
  }, []);

  const handleScoreUpdate = useCallback((k: number, hp: number, s: number, dCd: number, nCd: number) => {
    setKills(k);
    setCurrentHp(hp);
    setSurvivors(s);
    setDashCd(dCd);
    setNadeCd(nCd);
  }, []);

  return (
    <div className="relative w-full h-screen bg-[#333] text-white overflow-hidden select-none font-sans">
      
      {/* Background Game Layer */}
      <GameCanvas 
        gameState={gameState} 
        difficulty={difficulty}
        playerClass={playerClass}
        playerGender={playerGender}
        sessionId={sessionId}
        onGameOver={handleGameOver} 
        onScoreUpdate={handleScoreUpdate}
      />

      {/* Critical Health Overlay (Red Vignette) */}
      {(gameState === GameState.PLAYING || gameState === GameState.PAUSED) && (
        <div 
          className="absolute inset-0 pointer-events-none transition-opacity duration-300"
          style={{ 
            boxShadow: `inset 0 0 ${Math.max(0, 100 - currentHp) * 2}px ${Math.max(0, 100 - currentHp)}px rgba(220, 38, 38, 0.4)`,
            opacity: currentHp < 50 ? 1 : 0
          }}
        />
      )}

      {/* HUD - Visible when playing or paused */}
      {(gameState === GameState.PLAYING || gameState === GameState.PAUSED) && (
        <>
          {/* Top Left: Status */}
          <div className="absolute top-4 left-4 flex flex-col gap-2">
            <div className="flex items-center gap-2 bg-black/60 px-4 py-2 rounded-xl border-2 border-white/20 backdrop-blur shadow-lg">
              <Activity size={24} className={currentHp < 30 ? "text-red-500 animate-bounce" : "text-green-400"} />
              <div className="flex flex-col w-48">
                <div className="w-full h-4 bg-gray-800 rounded-full overflow-hidden border border-white/20">
                  <div 
                    className={`h-full transition-all duration-200 ${currentHp < 30 ? 'bg-red-500' : 'bg-green-500'}`}
                    style={{ width: `${Math.max(0, currentHp)}%` }}
                  />
                </div>
                <div className="flex justify-between mt-1">
                   <span className="text-[10px] text-white font-bold tracking-wider">能量</span>
                   {currentHp < 100 && (
                    <span className="text-[10px] text-red-300 font-bold flex items-center gap-1 animate-pulse">
                      <Zap size={10} fill="currentColor" /> 泄漏中!
                    </span>
                   )}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 bg-black/60 px-4 py-2 rounded-xl border-2 border-white/20 backdrop-blur shadow-lg">
              <Users size={20} className="text-blue-400" />
              <span className="font-black text-xl italic">{Math.max(1, survivors)} 幸存</span>
            </div>
          </div>

          {/* Top Center: Survival Mode Indicator */}
          <div className="absolute top-4 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2">
            <div className="bg-yellow-500 text-black px-6 py-2 rounded-full border-4 border-black shadow-[0_4px_0_rgba(0,0,0,1)] flex items-center gap-2 text-sm font-black tracking-widest uppercase transform hover:scale-110 transition-transform">
              <Zap size={18} fill="black" />
              生存模式!
            </div>
            <div className={`px-3 py-1 rounded text-xs font-bold border border-white/20 shadow-sm backdrop-blur-md uppercase tracking-wider
              ${difficulty === Difficulty.EASY ? 'bg-green-500/80 text-white' : 
                difficulty === Difficulty.HARD ? 'bg-red-600/80 text-white' : 'bg-blue-500/80 text-white'}`}>
              {difficultyLabels[difficulty]}
            </div>
          </div>

          {/* Top Right: Kills */}
          <div className="absolute top-4 right-4 bg-black/60 px-6 py-3 rounded-xl border-2 border-white/20 backdrop-blur flex items-center gap-4 shadow-lg">
             <div className="bg-red-500 p-2 rounded-full border-2 border-white">
               <Target size={24} className="text-white" />
             </div>
             <div className="flex flex-col items-end">
               <span className="text-xs text-gray-300 font-bold">已击败</span>
               <span className="text-3xl font-black text-white drop-shadow-md">{kills}</span>
               <span className="text-[10px] text-green-300 font-bold bg-green-900/50 px-2 rounded">+10 能量 / 击杀</span>
             </div>
          </div>

          {/* Bottom Center: Skills & Controls */}
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-4">
             {/* Skill Bar */}
             <div className="flex gap-6">
                {/* Dash Skill */}
                <div className="relative group">
                   <div className="w-16 h-16 rounded-2xl bg-black/60 border-2 border-white/20 flex items-center justify-center overflow-hidden">
                      {dashCd < 100 && (
                        <div className="absolute inset-0 bg-black/60 z-10 flex items-center justify-center">
                          <span className="text-xs font-bold text-white">{((3000 * (100-dashCd))/100000).toFixed(1)}</span>
                        </div>
                      )}
                      {dashCd < 100 && (
                        <div className="absolute bottom-0 left-0 w-full bg-blue-500/50" style={{ height: `${dashCd}%` }} />
                      )}
                      <Wind size={32} className={`${dashCd >= 100 ? 'text-blue-400' : 'text-gray-500'}`} />
                   </div>
                   <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-[10px] font-black uppercase bg-black px-2 py-0.5 rounded text-white">空格</div>
                   {dashCd >= 100 && <div className="absolute -top-2 -right-2 w-4 h-4 bg-green-500 rounded-full border-2 border-black animate-pulse" />}
                </div>

                {/* Grenade Skill */}
                <div className="relative group">
                   <div className="w-16 h-16 rounded-2xl bg-black/60 border-2 border-white/20 flex items-center justify-center overflow-hidden">
                      {nadeCd < 100 && (
                        <div className="absolute inset-0 bg-black/60 z-10 flex items-center justify-center">
                          <span className="text-xs font-bold text-white">{((8000 * (100-nadeCd))/100000).toFixed(1)}</span>
                        </div>
                      )}
                      {nadeCd < 100 && (
                        <div className="absolute bottom-0 left-0 w-full bg-emerald-500/50" style={{ height: `${nadeCd}%` }} />
                      )}
                      <Bomb size={32} className={`${nadeCd >= 100 ? 'text-emerald-400' : 'text-gray-500'}`} />
                   </div>
                   <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-[10px] font-black uppercase bg-black px-2 py-0.5 rounded text-white">E 键</div>
                   {nadeCd >= 100 && <div className="absolute -top-2 -right-2 w-4 h-4 bg-green-500 rounded-full border-2 border-black animate-pulse" />}
                </div>
             </div>

             <div className="text-white/80 text-sm font-black bg-black/40 px-4 py-2 rounded-full backdrop-blur border border-white/10 whitespace-nowrap mt-2">
                [WASD] 移动 • [鼠标] 瞄准射击 • [ESC] 暂停
             </div>
          </div>
        </>
      )}

      {/* PAUSE MENU OVERLAY */}
      {gameState === GameState.PAUSED && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
           <div className="bg-gray-900 border-4 border-white/10 p-8 rounded-3xl shadow-2xl text-center w-80">
              <div className="flex justify-center mb-4">
                 <div className="bg-yellow-500 p-3 rounded-full border-2 border-black shadow-[4px_4px_0_black]">
                   <Pause size={32} fill="black" className="text-black" />
                 </div>
              </div>
              <h2 className="text-4xl font-black text-white italic mb-8 uppercase tracking-wider">已暂停</h2>
              
              <div className="flex flex-col gap-3">
                 <button 
                   onClick={handleResume}
                   className="w-full py-4 bg-green-500 hover:bg-green-400 text-black font-black uppercase rounded-xl flex items-center justify-center gap-2 shadow-[0_4px_0_rgba(0,0,0,0.3)] hover:translate-y-1 hover:shadow-none transition-all"
                 >
                    <Play size={20} fill="black" /> 继续游戏
                 </button>
                 
                 <button 
                   onClick={handleStartGame}
                   className="w-full py-4 bg-blue-500 hover:bg-blue-400 text-white font-black uppercase rounded-xl flex items-center justify-center gap-2 shadow-[0_4px_0_rgba(0,0,0,0.3)] hover:translate-y-1 hover:shadow-none transition-all"
                 >
                    <RotateCcw size={20} /> 重新开始
                 </button>

                 <button 
                   onClick={handleReturnHome}
                   className="w-full py-4 bg-gray-700 hover:bg-gray-600 text-white font-black uppercase rounded-xl flex items-center justify-center gap-2 shadow-[0_4px_0_rgba(0,0,0,0.3)] hover:translate-y-1 hover:shadow-none transition-all"
                 >
                    <Home size={20} /> 返回主页
                 </button>
              </div>
           </div>
        </div>
      )}

      {/* Main Menu Overlay */}
      {gameState === GameState.MENU && (
        <div className="absolute inset-0 flex items-center justify-center z-10 bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-800 overflow-y-auto py-8">
           {/* Abstract Pattern Overlay */}
           <div className="fixed inset-0 opacity-20 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] pointer-events-none"></div>
          
          <div className="relative max-w-2xl w-full p-8 bg-white/10 backdrop-blur-md rounded-3xl border-4 border-white/20 shadow-2xl text-center">
            <div className="mb-4">
              <div className="inline-block px-4 py-1 bg-yellow-400 text-black font-black text-sm mb-4 rounded-full shadow-lg rotate-[-2deg]">生存竞技场</div>
              <h1 className="text-6xl font-black mb-2 italic tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-pink-500 drop-shadow-[0_4px_0_rgba(0,0,0,0.5)]">
                卡通大乱斗
              </h1>
            </div>

            <div className="bg-black/40 rounded-2xl p-4 mb-6 text-left border-2 border-white/10 relative overflow-hidden min-h-[100px]">
              <div className="flex items-center gap-2 text-yellow-400 mb-2">
                <div className="w-3 h-3 rounded-full bg-red-500 animate-ping"></div>
                <span className="text-xs font-black uppercase tracking-wider">主持人消息</span>
              </div>
              {loadingAI ? (
                <div className="text-white/50 animate-pulse font-mono text-sm">连接信号中...</div>
              ) : missionData ? (
                <>
                  <h3 className="text-lg font-black text-white mb-1 uppercase italic">{missionData.title}</h3>
                  <p className="text-sm text-gray-200 font-medium leading-relaxed">"{missionData.briefing}"</p>
                </>
              ) : (
                <p className="text-red-400 text-sm font-bold">信号丢失。</p>
              )}
            </div>

            {/* Difficulty Selector */}
            <div className="mb-4">
              <div className="text-xs font-bold text-gray-300 uppercase tracking-widest mb-2">选择难度</div>
              <div className="grid grid-cols-3 gap-2">
                {[Difficulty.EASY, Difficulty.NORMAL, Difficulty.HARD].map((diff) => (
                  <button 
                    key={diff}
                    onClick={() => setDifficulty(diff)}
                    className={`py-2 rounded-xl font-black text-sm uppercase transition-all border-2
                      ${difficulty === diff
                        ? 'bg-yellow-500 border-white text-black shadow-[0_4px_0_rgba(0,0,0,0.2)] scale-105' 
                        : 'bg-black/30 border-transparent text-gray-400 hover:bg-black/50'}`}
                  >
                    {difficultyLabels[diff]}
                  </button>
                ))}
              </div>
            </div>

            {/* Gender Selection */}
            <div className="mb-4">
              <div className="text-xs font-bold text-gray-300 uppercase tracking-widest mb-2">选择角色</div>
              <div className="flex gap-3 justify-center">
                 <button
                   onClick={() => setPlayerGender(Gender.MALE)}
                   className={`flex-1 py-3 rounded-xl border-2 flex items-center justify-center gap-2 transition-all
                    ${playerGender === Gender.MALE 
                      ? 'bg-blue-600 border-blue-400 shadow-lg scale-105' 
                      : 'bg-black/30 border-transparent hover:bg-black/50 text-gray-400'}`}
                 >
                   <User size={20} className={playerGender === Gender.MALE ? 'text-white' : 'text-gray-500'} />
                   <span className="font-black uppercase">男性</span>
                 </button>
                 <button
                   onClick={() => setPlayerGender(Gender.FEMALE)}
                   className={`flex-1 py-3 rounded-xl border-2 flex items-center justify-center gap-2 transition-all
                    ${playerGender === Gender.FEMALE 
                      ? 'bg-pink-600 border-pink-400 shadow-lg scale-105' 
                      : 'bg-black/30 border-transparent hover:bg-black/50 text-gray-400'}`}
                 >
                   <User size={20} className={playerGender === Gender.FEMALE ? 'text-white' : 'text-gray-500'} />
                   <span className="font-black uppercase">女性</span>
                 </button>
              </div>
            </div>

             {/* Character/Class Selector */}
             <div className="mb-6">
              <div className="text-xs font-bold text-gray-300 uppercase tracking-widest mb-2">选择职业</div>
              <div className="grid grid-cols-2 gap-3">
                {Object.values(PlayerClass).map((pClass) => (
                  <button 
                    key={pClass}
                    onClick={() => setPlayerClass(pClass)}
                    className={`p-3 rounded-xl border-2 transition-all flex items-center gap-3 text-left group
                      ${playerClass === pClass 
                        ? `bg-black/60 ${classInfo[pClass].border} shadow-lg scale-[1.02]` 
                        : 'bg-black/20 border-transparent hover:bg-black/40'}`}
                  >
                    <div className={`p-2 rounded-lg bg-black/40 ${classInfo[pClass].color}`}>
                      {classInfo[pClass].icon}
                    </div>
                    <div>
                      <div className={`text-sm font-black uppercase ${playerClass === pClass ? 'text-white' : 'text-gray-400'}`}>
                        {classInfo[pClass].name}
                      </div>
                      <div className="text-[10px] text-gray-400 font-bold">{classInfo[pClass].desc}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <button 
              onClick={handleStartGame}
              className="w-full py-5 bg-gradient-to-r from-green-400 to-blue-500 hover:from-green-300 hover:to-blue-400 text-white font-black text-2xl uppercase tracking-widest rounded-2xl shadow-[0_6px_0_rgba(0,0,0,0.3)] hover:shadow-[0_3px_0_rgba(0,0,0,0.3)] hover:translate-y-[3px] transition-all flex items-center justify-center gap-3 border-2 border-white/20"
            >
              <Play size={32} fill="currentColor" />
              开始游戏
            </button>
          </div>
        </div>
      )}

      {/* Game Over Overlay */}
      {gameState === GameState.GAME_OVER && (
        <div className="absolute inset-0 flex items-center justify-center z-10 bg-black/90 backdrop-blur-md">
           <div className="max-w-md w-full p-8 bg-gray-900 border-4 border-white/10 rounded-3xl shadow-2xl text-center relative overflow-hidden">
            
            <h2 className="text-6xl font-black text-white mb-2 italic drop-shadow-lg transform rotate-[-2deg]">游戏结束</h2>
            <div className="text-purple-400 font-bold text-lg mb-8 uppercase tracking-wider">比赛结果</div>
            
            <div className="grid grid-cols-2 gap-4 mb-8">
              <div className="bg-white/5 p-4 rounded-2xl border border-white/10">
                <div className="text-xs text-gray-400 font-bold mb-1">击杀数</div>
                <div className="text-4xl font-black text-yellow-400">{kills}</div>
              </div>
              <div className="bg-white/5 p-4 rounded-2xl border border-white/10">
                <div className="text-xs text-gray-400 font-bold mb-1">排名</div>
                <div className="text-2xl font-black text-green-400">{kills > 10 ? '#1' : `#${Math.max(2, 99 - kills * 2)}`}</div>
              </div>
            </div>

            <div className="bg-indigo-900/30 border-2 border-indigo-500/30 p-6 mb-8 text-left rounded-2xl relative">
               <div className="flex items-center gap-2 mb-3">
                 <Shield size={18} className="text-indigo-400" />
                 <span className="text-xs font-black text-indigo-300 uppercase">主持人点评</span>
               </div>
               
               {loadingAI ? (
                 <div className="text-indigo-300/50 animate-pulse text-sm font-bold">生成回放点评中...</div>
               ) : reportData ? (
                 <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
                   <div className="flex items-baseline gap-2 mb-2">
                      <span className="text-2xl font-black text-white bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-purple-400">
                        {reportData.rank}
                      </span>
                   </div>
                   <p className="text-md text-gray-300 italic font-medium">"{reportData.comment}"</p>
                 </div>
               ) : (
                 <p className="text-gray-500 text-sm">无法获取报告。</p>
               )}
            </div>

            <div className="flex gap-4">
              <button 
                onClick={handleReturnHome}
                className="flex-1 py-4 bg-gray-700 hover:bg-gray-600 rounded-xl font-bold text-white flex items-center justify-center gap-2 transition-colors shadow-lg"
              >
                <Home size={20} />
                主页
              </button>
              <button 
                onClick={() => {
                  setSessionId(prev => prev + 1);
                  setGameState(GameState.PLAYING);
                  setMissionData(null);
                  generateMissionBriefing().then(setMissionData);
                }}
                className="flex-[2] py-4 bg-blue-600 hover:bg-blue-500 rounded-xl font-bold text-white flex items-center justify-center gap-2 transition-colors shadow-lg"
              >
                <RotateCcw size={20} />
                再玩一次
              </button>
            </div>
           </div>
        </div>
      )}
    </div>
  );
}

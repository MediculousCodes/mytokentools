"use client"
import React, { useEffect, useState } from 'react';

export default function ThemeToggle(){
  const [dark, setDark] = useState(false);
  useEffect(()=>{
    const stored = typeof window !== 'undefined' && localStorage.getItem('theme');
    setDark(stored === 'dark');
    if(stored === 'dark') document.documentElement.classList.add('dark');
  },[]);

  function toggle(){
    const next = !dark;
    setDark(next);
    if(next) { document.documentElement.classList.add('dark'); localStorage.setItem('theme','dark'); }
    else { document.documentElement.classList.remove('dark'); localStorage.setItem('theme','light'); }
  }

  return (
    <button onClick={toggle} aria-pressed={dark} className="px-2 py-1 border rounded text-sm">
      {dark ? 'Light' : 'Dark'}
    </button>
  )
}

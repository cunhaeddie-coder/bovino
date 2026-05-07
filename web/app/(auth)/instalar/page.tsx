"use client";

import Link from "next/link";
import { useState } from "react";

export default function InstalarPage() {
  const [sistema, setSistema] = useState<"android" | "ios">("android");

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 px-4 py-8">
      <Link href="/" className="text-2xl font-bold text-green-700 mb-2">🐄 Bovino</Link>
      <p className="text-gray-500 text-sm mb-8">App Curral — para vaqueiros</p>

      <div className="bg-white rounded-2xl shadow p-6 w-full max-w-sm space-y-5">
        <div className="text-center">
          <div className="text-5xl mb-2">📲</div>
          <h1 className="text-xl font-bold text-gray-900">Instale o App</h1>
          <p className="text-sm text-gray-500 mt-1">Adicione o Bovino à tela inicial do seu celular</p>
        </div>

        {/* Seletor Android / iOS */}
        <div className="flex bg-gray-100 rounded-full p-1">
          <button onClick={() => setSistema("android")}
            className={`flex-1 py-2 rounded-full text-sm font-semibold transition-all ${sistema === "android" ? "bg-white shadow text-green-700" : "text-gray-500"}`}>
            🤖 Android
          </button>
          <button onClick={() => setSistema("ios")}
            className={`flex-1 py-2 rounded-full text-sm font-semibold transition-all ${sistema === "ios" ? "bg-white shadow text-gray-800" : "text-gray-500"}`}>
            🍎 iPhone
          </button>
        </div>

        {sistema === "android" ? (
          <ol className="space-y-3 text-sm text-gray-700">
            <li className="flex gap-3">
              <span className="w-6 h-6 rounded-full bg-green-100 text-green-700 font-bold flex items-center justify-center shrink-0 text-xs">1</span>
              <span>Abra o <strong>Chrome</strong> no seu celular e acesse <strong>bovino.agr.br</strong></span>
            </li>
            <li className="flex gap-3">
              <span className="w-6 h-6 rounded-full bg-green-100 text-green-700 font-bold flex items-center justify-center shrink-0 text-xs">2</span>
              <span>Toque nos <strong>3 pontinhos</strong> (⋮) no canto superior direito</span>
            </li>
            <li className="flex gap-3">
              <span className="w-6 h-6 rounded-full bg-green-100 text-green-700 font-bold flex items-center justify-center shrink-0 text-xs">3</span>
              <span>Toque em <strong>"Adicionar à tela inicial"</strong></span>
            </li>
            <li className="flex gap-3">
              <span className="w-6 h-6 rounded-full bg-green-100 text-green-700 font-bold flex items-center justify-center shrink-0 text-xs">4</span>
              <span>Confirme tocando em <strong>"Adicionar"</strong></span>
            </li>
            <li className="flex gap-3">
              <span className="w-6 h-6 rounded-full bg-green-100 text-green-700 font-bold flex items-center justify-center shrink-0 text-xs">5</span>
              <span>O ícone 🐄 aparece na sua tela inicial. Pronto!</span>
            </li>
          </ol>
        ) : (
          <ol className="space-y-3 text-sm text-gray-700">
            <li className="flex gap-3">
              <span className="w-6 h-6 rounded-full bg-gray-100 text-gray-700 font-bold flex items-center justify-center shrink-0 text-xs">1</span>
              <span>Abra o <strong>Safari</strong> (não funciona em outros navegadores) e acesse <strong>bovino.agr.br</strong></span>
            </li>
            <li className="flex gap-3">
              <span className="w-6 h-6 rounded-full bg-gray-100 text-gray-700 font-bold flex items-center justify-center shrink-0 text-xs">2</span>
              <span>Toque no ícone de <strong>compartilhar</strong> (quadrado com seta ↑) na barra inferior</span>
            </li>
            <li className="flex gap-3">
              <span className="w-6 h-6 rounded-full bg-gray-100 text-gray-700 font-bold flex items-center justify-center shrink-0 text-xs">3</span>
              <span>Role para baixo e toque em <strong>"Adicionar à Tela de Início"</strong></span>
            </li>
            <li className="flex gap-3">
              <span className="w-6 h-6 rounded-full bg-gray-100 text-gray-700 font-bold flex items-center justify-center shrink-0 text-xs">4</span>
              <span>Toque em <strong>"Adicionar"</strong> no canto superior direito</span>
            </li>
            <li className="flex gap-3">
              <span className="w-6 h-6 rounded-full bg-gray-100 text-gray-700 font-bold flex items-center justify-center shrink-0 text-xs">5</span>
              <span>O ícone 🐄 aparece na sua tela inicial. Pronto!</span>
            </li>
          </ol>
        )}

        <div className="bg-green-50 rounded-xl p-3 text-xs text-green-800 border border-green-100">
          Após instalar, entre com o código enviado pelo seu gestor via WhatsApp.
        </div>

        <Link href="/login?modo=vaqueiro"
          className="block w-full bg-amber-600 text-white text-center rounded-xl py-3 font-semibold hover:bg-amber-700 transition-colors">
          🤠 Já instalei — Entrar como Vaqueiro
        </Link>
      </div>
    </div>
  );
}

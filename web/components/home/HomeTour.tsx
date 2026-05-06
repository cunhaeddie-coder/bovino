"use client";

import { TourButton } from "@/components/ui/TourButton";
import type { DriveStep } from "driver.js";

const TOUR_STEPS: DriveStep[] = [
  {
    element: "#hero-search",
    popover: {
      title: "🔍 Busca de gado",
      description: "Pesquise por raça (Nelore, Angus, Girolando...) e filtre por estado. Encontre gado em todo o Brasil em segundos.",
      side: "bottom",
    },
  },
  {
    element: "#secao-recentes",
    popover: {
      title: "🕐 Anúncios recentes",
      description: "Aqui aparecem os últimos anúncios publicados. Clique em qualquer card para ver detalhes, fotos e entrar em contato com o vendedor.",
      side: "top",
    },
  },
  {
    element: "#cta-vender",
    popover: {
      title: "📢 Anuncie seu gado",
      description: "Tem gado para vender? Crie sua conta gratuitamente e publique seu anúncio alcançando compradores em todo o Brasil. Sem intermediários.",
      side: "top",
    },
  },
  {
    popover: {
      title: "📱 Navegação",
      description: "Use o menu no rodapé para navegar entre Início, Busca, Anunciar, Gestão da fazenda e Perfil. O botão ➕ central publica um novo anúncio rapidamente.",
    },
  },
];

export function HomeTour() {
  return <TourButton tourKey="home" steps={TOUR_STEPS} />;
}

export type ReportSectionToneId = 'overview' | 'coaching' | 'verdict' | 'next_visit';

type ReportToneConfig = {
  heroClass: string;
  previewCardClass: string;
  accentTextClass: string;
  accentTextMutedClass: string;
  accentSurfaceClass: string;
  accentBorderClass: string;
  actionPillClass: string;
  progressBarClass: string;
};

export function getReportSectionTone(section: ReportSectionToneId, grade: string): ReportToneConfig {
  if (section === 'overview') {
    return {
      heroClass:
        'border-[#7395c1]/42 bg-[linear-gradient(135deg,#355984_0%,#4c75a7_54%,#6f9ac6_100%)] shadow-[0_20px_60px_rgba(58,92,136,0.18)] dark:border-white/10 dark:bg-[linear-gradient(180deg,rgba(14,18,26,0.96)_0%,rgba(7,10,14,0.96)_100%)] dark:shadow-[0_28px_90px_rgba(0,0,0,0.35)]',
      previewCardClass:
        'border-[#4b6991]/55 bg-[linear-gradient(135deg,#18263b_0%,#22344e_58%,#324a6a_100%)] dark:border-white/10 dark:bg-[linear-gradient(180deg,rgba(14,18,26,0.96)_0%,rgba(7,10,14,0.96)_100%)]',
      accentTextClass: 'text-[#426ea8] dark:text-white/42',
      accentTextMutedClass: 'text-[#426ea8]/80 dark:text-white/40',
      accentSurfaceClass: 'bg-[#edf3fb] dark:bg-black/14',
      accentBorderClass: 'border-[#5c8fce]/16 dark:border-white/8',
      actionPillClass: 'border-[#5c8fce]/18 bg-[#edf3fb] text-[#365a89] hover:bg-[#e4edf9] dark:border-white/10 dark:bg-white/5 dark:text-white/78 dark:hover:bg-white/10',
      progressBarClass:
        'bg-[linear-gradient(90deg,#547eb7_0%,#6d9fcb_100%)] shadow-[0_0_12px_rgba(83,126,183,0.28)] dark:bg-[linear-gradient(90deg,rgba(214,224,237,0.92)_0%,rgba(167,184,207,0.92)_48%,rgba(112,131,158,0.88)_100%)] dark:shadow-[0_0_18px_rgba(164,182,204,0.22)]',
    };
  }

  if (section === 'coaching') {
    return {
      heroClass:
        'border-[#c09e69]/40 bg-[linear-gradient(135deg,#765634_0%,#987247_54%,#bd9661_100%)] shadow-[0_20px_60px_rgba(118,86,52,0.16)] dark:border-white/10 dark:bg-[linear-gradient(180deg,rgba(14,18,26,0.96)_0%,rgba(7,10,14,0.96)_100%)] dark:shadow-[0_28px_90px_rgba(0,0,0,0.35)]',
      previewCardClass:
        'border-[#7e6540]/58 bg-[linear-gradient(135deg,#231b11_0%,#322518_58%,#4a3823_100%)] dark:border-white/10 dark:bg-[linear-gradient(180deg,rgba(14,18,26,0.96)_0%,rgba(7,10,14,0.96)_100%)]',
      accentTextClass: 'text-[#9f7737] dark:text-white/42',
      accentTextMutedClass: 'text-[#9f7737]/80 dark:text-white/40',
      accentSurfaceClass: 'bg-[#f8f1e6] dark:bg-black/14',
      accentBorderClass: 'border-[#c79c51]/16 dark:border-white/8',
      actionPillClass: 'border-[#c79c51]/18 bg-[#f8f1e6] text-[#7a5d2b] hover:bg-[#f1e7d7] dark:border-white/10 dark:bg-white/5 dark:text-white/78 dark:hover:bg-white/10',
      progressBarClass:
        'bg-[linear-gradient(90deg,#aa8340_0%,#d1ad70_100%)] shadow-[0_0_12px_rgba(170,131,64,0.24)] dark:bg-[linear-gradient(90deg,rgba(214,224,237,0.92)_0%,rgba(167,184,207,0.92)_48%,rgba(112,131,158,0.88)_100%)] dark:shadow-[0_0_18px_rgba(164,182,204,0.22)]',
    };
  }

  if (section === 'next_visit') {
    return {
      heroClass:
        'border-[#6ea5a1]/42 bg-[linear-gradient(135deg,#2c605f_0%,#3f7f7d_56%,#5ca3a0_100%)] shadow-[0_20px_60px_rgba(44,96,95,0.18)] dark:border-white/10 dark:bg-[linear-gradient(180deg,rgba(14,18,26,0.96)_0%,rgba(7,10,14,0.96)_100%)] dark:shadow-[0_28px_90px_rgba(0,0,0,0.35)]',
      previewCardClass:
        'border-[#406f6d]/56 bg-[linear-gradient(135deg,#122625_0%,#173333_54%,#234848_100%)] dark:border-white/10 dark:bg-[linear-gradient(180deg,rgba(14,18,26,0.96)_0%,rgba(7,10,14,0.96)_100%)]',
      accentTextClass: 'text-[#3f8a87] dark:text-white/42',
      accentTextMutedClass: 'text-[#3f8a87]/80 dark:text-white/40',
      accentSurfaceClass: 'bg-[#e9f6f4] dark:bg-black/14',
      accentBorderClass: 'border-[#4eafaa]/16 dark:border-white/8',
      actionPillClass: 'border-[#4eafaa]/18 bg-[#e9f6f4] text-[#2d6866] hover:bg-[#def0ed] dark:border-white/10 dark:bg-white/5 dark:text-white/78 dark:hover:bg-white/10',
      progressBarClass:
        'bg-[linear-gradient(90deg,#43928f_0%,#6bbab4_100%)] shadow-[0_0_12px_rgba(67,146,143,0.24)] dark:bg-[linear-gradient(90deg,rgba(214,224,237,0.92)_0%,rgba(167,184,207,0.92)_48%,rgba(112,131,158,0.88)_100%)] dark:shadow-[0_0_18px_rgba(164,182,204,0.22)]',
    };
  }

  return getVerdictTone(grade);
}

function getVerdictTone(grade: string): ReportToneConfig {
  if (grade === 'A') {
    return {
      heroClass:
        'border-[#639d75]/42 bg-[linear-gradient(135deg,#2f5a3c_0%,#417550_56%,#5d966c_100%)] shadow-[0_20px_60px_rgba(47,90,60,0.18)] dark:border-white/10 dark:bg-[linear-gradient(180deg,rgba(14,18,26,0.96)_0%,rgba(7,10,14,0.96)_100%)] dark:shadow-[0_28px_90px_rgba(0,0,0,0.35)]',
      previewCardClass:
        'border-[#3c7050]/58 bg-[linear-gradient(135deg,#112219_0%,#193225_58%,#254936_100%)] dark:border-white/10 dark:bg-[linear-gradient(180deg,rgba(14,18,26,0.96)_0%,rgba(7,10,14,0.96)_100%)]',
      accentTextClass: 'text-[#2f864b] dark:text-white/42',
      accentTextMutedClass: 'text-[#2f864b]/80 dark:text-white/40',
      accentSurfaceClass: 'bg-[#e8f5eb] dark:bg-black/14',
      accentBorderClass: 'border-[#39a85c]/16 dark:border-white/8',
      actionPillClass: 'border-[#39a85c]/18 bg-[#e8f5eb] text-[#2a7042] hover:bg-[#dff0e4] dark:border-white/10 dark:bg-white/5 dark:text-white/78 dark:hover:bg-white/10',
      progressBarClass:
        'bg-[linear-gradient(90deg,#2f8a4c_0%,#58b976_100%)] shadow-[0_0_12px_rgba(47,138,76,0.24)] dark:bg-[linear-gradient(90deg,rgba(214,224,237,0.92)_0%,rgba(167,184,207,0.92)_48%,rgba(112,131,158,0.88)_100%)] dark:shadow-[0_0_18px_rgba(164,182,204,0.22)]',
    };
  }

  if (grade === 'B') {
    return {
      heroClass:
        'border-[#7d99be]/42 bg-[linear-gradient(135deg,#3a587f_0%,#5175a2_54%,#7096bf_100%)] shadow-[0_20px_60px_rgba(58,88,127,0.18)] dark:border-white/10 dark:bg-[linear-gradient(180deg,rgba(14,18,26,0.96)_0%,rgba(7,10,14,0.96)_100%)] dark:shadow-[0_28px_90px_rgba(0,0,0,0.35)]',
      previewCardClass:
        'border-[#52698a]/56 bg-[linear-gradient(135deg,#172232_0%,#223247_58%,#314760_100%)] dark:border-white/10 dark:bg-[linear-gradient(180deg,rgba(14,18,26,0.96)_0%,rgba(7,10,14,0.96)_100%)]',
      accentTextClass: 'text-[#527ba8] dark:text-white/42',
      accentTextMutedClass: 'text-[#527ba8]/80 dark:text-white/40',
      accentSurfaceClass: 'bg-[#edf3fa] dark:bg-black/14',
      accentBorderClass: 'border-[#5f8fc8]/16 dark:border-white/8',
      actionPillClass: 'border-[#5f8fc8]/18 bg-[#edf3fa] text-[#436589] hover:bg-[#e4ecf7] dark:border-white/10 dark:bg-white/5 dark:text-white/78 dark:hover:bg-white/10',
      progressBarClass:
        'bg-[linear-gradient(90deg,#5b82af_0%,#7ea6c9_100%)] shadow-[0_0_12px_rgba(91,130,175,0.24)] dark:bg-[linear-gradient(90deg,rgba(214,224,237,0.92)_0%,rgba(167,184,207,0.92)_48%,rgba(112,131,158,0.88)_100%)] dark:shadow-[0_0_18px_rgba(164,182,204,0.22)]',
    };
  }

  if (grade === 'C') {
    return {
      heroClass:
        'border-[#b38b5a]/42 bg-[linear-gradient(135deg,#6b4824_0%,#8c6136_56%,#b08252_100%)] shadow-[0_20px_60px_rgba(107,72,36,0.18)] dark:border-white/10 dark:bg-[linear-gradient(180deg,rgba(14,18,26,0.96)_0%,rgba(7,10,14,0.96)_100%)] dark:shadow-[0_28px_90px_rgba(0,0,0,0.35)]',
      previewCardClass:
        'border-[#7e6140]/58 bg-[linear-gradient(135deg,#241911_0%,#342418_58%,#4d3623_100%)] dark:border-white/10 dark:bg-[linear-gradient(180deg,rgba(14,18,26,0.96)_0%,rgba(7,10,14,0.96)_100%)]',
      accentTextClass: 'text-[#9b6f33] dark:text-white/42',
      accentTextMutedClass: 'text-[#9b6f33]/80 dark:text-white/40',
      accentSurfaceClass: 'bg-[#f8f0e5] dark:bg-black/14',
      accentBorderClass: 'border-[#cf9850]/16 dark:border-white/8',
      actionPillClass: 'border-[#cf9850]/18 bg-[#f8f0e5] text-[#785427] hover:bg-[#f0e4d2] dark:border-white/10 dark:bg-white/5 dark:text-white/78 dark:hover:bg-white/10',
      progressBarClass:
        'bg-[linear-gradient(90deg,#a97938_0%,#d6aa69_100%)] shadow-[0_0_12px_rgba(169,121,56,0.24)] dark:bg-[linear-gradient(90deg,rgba(214,224,237,0.92)_0%,rgba(167,184,207,0.92)_48%,rgba(112,131,158,0.88)_100%)] dark:shadow-[0_0_18px_rgba(164,182,204,0.22)]',
    };
  }

  return {
    heroClass:
      'border-[#b3746e]/42 bg-[linear-gradient(135deg,#6d3532_0%,#914946_54%,#b7645d_100%)] shadow-[0_20px_60px_rgba(109,53,50,0.18)] dark:border-white/10 dark:bg-[linear-gradient(180deg,rgba(14,18,26,0.96)_0%,rgba(7,10,14,0.96)_100%)] dark:shadow-[0_28px_90px_rgba(0,0,0,0.35)]',
    previewCardClass:
      'border-[#7a4a46]/56 bg-[linear-gradient(135deg,#251514_0%,#341e1c_58%,#4b2a27_100%)] dark:border-white/10 dark:bg-[linear-gradient(180deg,rgba(14,18,26,0.96)_0%,rgba(7,10,14,0.96)_100%)]',
    accentTextClass: 'text-[#9b403a] dark:text-white/42',
    accentTextMutedClass: 'text-[#9b403a]/80 dark:text-white/40',
    accentSurfaceClass: 'bg-[#f9ecea] dark:bg-black/14',
    accentBorderClass: 'border-[#c96961]/16 dark:border-white/8',
    actionPillClass: 'border-[#c96961]/18 bg-[#f9ecea] text-[#7d342f] hover:bg-[#f1dfdc] dark:border-white/10 dark:bg-white/5 dark:text-white/78 dark:hover:bg-white/10',
    progressBarClass:
      'bg-[linear-gradient(90deg,#a6463f_0%,#cf7269_100%)] shadow-[0_0_12px_rgba(166,70,63,0.24)] dark:bg-[linear-gradient(90deg,rgba(214,224,237,0.92)_0%,rgba(167,184,207,0.92)_48%,rgba(112,131,158,0.88)_100%)] dark:shadow-[0_0_18px_rgba(164,182,204,0.22)]',
  };
}

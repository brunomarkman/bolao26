import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FileDown, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { Tables } from '@/integrations/supabase/types';
import { useLanguage } from '@/i18n/LanguageContext';

type Profile = Tables<'profiles'>;

interface Props { bolaoId: string; bolaoNickname: string; competitionId: string; }

interface MatchData { id: string; team_a: string; team_b: string; score_a: number | null; score_b: number | null; is_finished: boolean; match_date: string | null; group_name: string | null; phase_id: string; }
interface ExtraCol { key: 'champion' | 'golden_ball' | 'top_scorer'; label: string; }
interface ParticipantRow {
  name: string;
  totalScore: number;
  predictions: Record<string, { score_a: number; score_b: number; points: number | null }>;
  extras: { champion?: string | null; golden_ball?: string | null; top_scorer?: string | null };
}

const ResultsReport = ({ bolaoId, bolaoNickname, competitionId }: Props) => {
  const { t, language } = useLanguage();
  const [matches, setMatches] = useState<MatchData[]>([]);
  const [participantRows, setParticipantRows] = useState<ParticipantRow[]>([]);
  const [extraCols, setExtraCols] = useState<ExtraCol[]>([]);
  const [extraResults, setExtraResults] = useState<{ champion?: string | null; golden_ball?: string | null; top_scorer?: string | null }>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchData(); }, [bolaoId]);

  const fetchData = async () => {
    setLoading(true);
    // Load all matches across all phases of the competition
    const { data: phases } = await (supabase as any).from('phases').select('id, number').eq('competition_id', competitionId).order('number', { ascending: true });
    const phaseIds = (phases || []).map((p: any) => p.id);
    const { data: matchesData } = phaseIds.length
      ? await (supabase as any).from('matches').select('*').in('phase_id', phaseIds).order('match_date', { ascending: true })
      : { data: [] };
    setMatches(matchesData || []);

    // Bolão extra-question flags
    const { data: bolao } = await (supabase as any).from('boloes').select('extra_champion_enabled, extra_golden_ball_enabled, extra_top_scorer_enabled').eq('id', bolaoId).maybeSingle();
    const cols: ExtraCol[] = [];
    if (bolao?.extra_champion_enabled) cols.push({ key: 'champion', label: 'Campeão' });
    if (bolao?.extra_golden_ball_enabled) cols.push({ key: 'golden_ball', label: 'Bola de Ouro' });
    if (bolao?.extra_top_scorer_enabled) cols.push({ key: 'top_scorer', label: 'Artilheiro' });
    setExtraCols(cols);

    const { data: extraRes } = await (supabase as any).from('competition_extra_results').select('*').eq('competition_id', competitionId).maybeSingle();
    setExtraResults(extraRes || {});

    // Only active participants
    const { data: participants } = await (supabase as any).from('bolao_participants').select('*').eq('bolao_id', bolaoId).eq('is_active', true);
    if (!participants || participants.length === 0) { setParticipantRows([]); setLoading(false); return; }
    const { data: profiles } = await supabase.from('profiles').select('*');
    const matchIds = (matchesData || []).map((m: any) => m.id);
    const { data: predictions } = matchIds.length
      ? await (supabase as any).from('predictions').select('*').eq('bolao_id', bolaoId).in('match_id', matchIds)
      : { data: [] };
    const { data: extraPreds } = await (supabase as any).from('extra_predictions').select('*').eq('bolao_id', bolaoId);

    const rows: ParticipantRow[] = participants.map((p: any) => {
      const profile = profiles?.find((pr: Profile) => pr.user_id === p.user_id);
      const preds: Record<string, { score_a: number; score_b: number; points: number | null }> = {};
      if (predictions) predictions.filter((pred: any) => pred.user_id === p.user_id).forEach((pred: any) => { preds[pred.match_id] = { score_a: pred.score_a, score_b: pred.score_b, points: pred.points }; });
      const ep = (extraPreds || []).find((e: any) => e.user_id === p.user_id) || {};
      return {
        name: profile?.name || t('home.unknown'),
        totalScore: p.total_score,
        predictions: preds,
        extras: { champion: ep.champion, golden_ball: ep.golden_ball, top_scorer: ep.top_scorer },
      };
    });
    rows.sort((a, b) => b.totalScore - a.totalScore);
    setParticipantRows(rows); setLoading(false);
  };

  const exportPDF = () => {
    if (matches.length === 0 || participantRows.length === 0) { toast.error(t('report.noData')); return; }
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    doc.setFontSize(14); doc.text(`Bolão: ${bolaoNickname}`, 14, 15);
    doc.setFontSize(9); doc.text(`${t('report.generatedAt')} ${new Date().toLocaleString(language === 'en' ? 'en-US' : 'pt-BR')}`, 14, 21);
    const headers = [
      t('report.participant'),
      t('report.pts'),
      ...matches.map(m => `${m.team_a.substring(0, 3).toUpperCase()} x ${m.team_b.substring(0, 3).toUpperCase()}`),
      ...extraCols.map(c => c.label),
    ];
    const body = participantRows.map(row => [
      row.name,
      String(row.totalScore),
      ...matches.map(m => { const pred = row.predictions[m.id]; if (!pred) return '-'; const pts = pred.points !== null ? ` (${pred.points})` : ''; return `${pred.score_a}x${pred.score_b}${pts}`; }),
      ...extraCols.map(c => row.extras[c.key] || '-'),
    ]);
    body.push([
      t('report.result'), '',
      ...matches.map(m => m.is_finished && m.score_a !== null && m.score_b !== null ? `${m.score_a}x${m.score_b}` : '-'),
      ...extraCols.map(c => extraResults[c.key] || '-'),
    ]);
    autoTable(doc, { head: [headers], body, startY: 25, styles: { fontSize: 6, cellPadding: 1.5, overflow: 'linebreak' }, headStyles: { fillColor: [41, 128, 185], fontSize: 6, cellPadding: 1.5 }, columnStyles: { 0: { cellWidth: 30 }, 1: { cellWidth: 10, halign: 'center' } }, didParseCell: (data) => { if (data.row.index === body.length - 1) { data.cell.styles.fontStyle = 'bold'; data.cell.styles.fillColor = [230, 230, 230]; } } });
    doc.save(`bolao_${bolaoNickname.replace(/\s+/g, '_')}.pdf`);
    toast.success(t('report.pdfSuccess'));
  };

  if (loading) return <Card><CardContent className="flex items-center justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-primary" /></CardContent></Card>;
  if (matches.length === 0) return <Card><CardHeader><CardTitle className="font-display text-sm tracking-wider">{t('report.title')}</CardTitle></CardHeader><CardContent><p className="text-center text-muted-foreground py-8">{t('report.noActivePhase')}</p></CardContent></Card>;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center gap-3">
        <CardTitle className="font-display text-sm tracking-wider">{t('report.title')}</CardTitle>
        <Button onClick={exportPDF} size="sm" className="gap-1"><FileDown className="w-4 h-4" /> {t('report.exportPdf')}</Button>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left p-1.5 font-medium text-muted-foreground sticky left-0 bg-card z-10 min-w-[100px]">{t('report.participant')}</th>
                <th className="text-center p-1.5 font-medium text-muted-foreground min-w-[35px]">{t('report.pts')}</th>
                {matches.map(m => (
                  <th key={m.id} className="text-center p-1.5 font-medium text-muted-foreground min-w-[60px]">
                    <div className="flex flex-col items-center gap-0.5"><span>{m.team_a.substring(0, 3).toUpperCase()}</span><span className="text-[10px]">x</span><span>{m.team_b.substring(0, 3).toUpperCase()}</span></div>
                  </th>
                ))}
                {extraCols.map(c => (
                  <th key={c.key} className="text-center p-1.5 font-medium text-muted-foreground min-w-[80px]">{c.label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {participantRows.map((row, i) => (
                <tr key={i} className="border-b border-border/50 hover:bg-muted/30">
                  <td className="p-1.5 font-medium sticky left-0 bg-card z-10">{row.name}</td>
                  <td className="p-1.5 text-center font-bold text-primary">{row.totalScore}</td>
                  {matches.map(m => { const pred = row.predictions[m.id]; return (<td key={m.id} className="p-1.5 text-center">{pred ? <div><span>{pred.score_a}x{pred.score_b}</span>{pred.points !== null && <span className="text-[10px] text-primary ml-0.5">({pred.points})</span>}</div> : '-'}</td>); })}
                  {extraCols.map(c => (
                    <td key={c.key} className="p-1.5 text-center">{row.extras[c.key] || '-'}</td>
                  ))}
                </tr>
              ))}
              <tr className="border-t-2 border-primary/30 bg-muted/50 font-bold">
                <td className="p-1.5 sticky left-0 bg-muted/50 z-10">{t('report.result')}</td>
                <td className="p-1.5"></td>
                {matches.map(m => (<td key={m.id} className="p-1.5 text-center">{m.is_finished && m.score_a !== null && m.score_b !== null ? `${m.score_a}x${m.score_b}` : '-'}</td>))}
                {extraCols.map(c => (
                  <td key={c.key} className="p-1.5 text-center">{extraResults[c.key] || '-'}</td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
};

export default ResultsReport;

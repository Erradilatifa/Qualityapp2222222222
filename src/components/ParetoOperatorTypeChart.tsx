import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Platform, Modal, Dimensions, Animated, Easing } from 'react-native';
import { Svg, Rect, Line, Text as SvgText, G } from 'react-native-svg';
import Feather from '@expo/vector-icons/Feather';
import { useTheme } from '../context/ThemeContext';
import { spacing, borderRadius, typography } from '../theme/spacing';
import DatePickerWeb from './common/DatePickerWeb';
import { Operator, CODES_DEFAUT_PAR_CATEGORIE } from '../types/Operator';
import { operatorService } from '../services/database';

type TimeMode = 'day' | 'week' | 'month' | 'custom';

interface SegmentInfo { operator: string; type: string; count: number; }

const PALETTE = ['#FF6700','#0A2342','#19376D','#FF8C42','#2ECC71','#FFC300','#FF3B30','#9B59B6','#3498DB','#E74C3C','#1ABC9C','#F39C12','#E67E22','#95A5A6','#34495E'];

const AnimatedRect = Animated.createAnimatedComponent(Rect);
const AnimatedLine = Animated.createAnimatedComponent(Line);
const AnimatedSvgText = Animated.createAnimatedComponent(SvgText);

function normalizeDate(input: any): Date | null {
  if (!input) return null; if (input instanceof Date) return input; if (typeof input === 'string') return new Date(input); if (typeof input === 'object' && typeof (input as any).toDate === 'function') return (input as any).toDate(); return null;
}
const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const endOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23,59,59,999);
const getWeekRange = (date: Date) => { const d = new Date(date); const day = d.getDay(); const diff = day === 0 ? -6 : 1 - day; const start = startOfDay(new Date(d.getFullYear(), d.getMonth(), d.getDate()+diff)); const end = endOfDay(new Date(start.getFullYear(), start.getMonth(), start.getDate()+6)); return { start, end }; };
const getMonthRange = (date: Date) => { const start = new Date(date.getFullYear(), date.getMonth(), 1); const end = endOfDay(new Date(date.getFullYear(), date.getMonth()+1, 0)); return { start, end }; };
const fmt = (d: Date) => d.toLocaleDateString('fr-FR', { day:'2-digit', month:'2-digit', year:'numeric' });

function labelFromCode(code?: string | null): string | null {
  if (!code) return null;
  const c = String(code).trim();
  for (const [, codes] of Object.entries(CODES_DEFAUT_PAR_CATEGORIE)) {
    if (codes[c]) return codes[c];
  }
  return null;
}

function capitalize(s: string) { return s ? s.charAt(0).toUpperCase() + s.slice(1).toLowerCase() : s; }
function shortOperatorName(full: string): string {
  const sanitized = (full || '').replace(/\s+/g, ' ').trim();
  if (!sanitized) return 'N/A';
  const parts = sanitized.split(' ');
  const first = parts[0] || '';
  const last = parts.length > 1 ? parts[parts.length - 1] : '';
  const firstCap = capitalize(first);
  if (!last) return firstCap.length > 12 ? firstCap.slice(0, 12) + '…' : firstCap;
  const label = `${firstCap} ${last.charAt(0).toUpperCase()}.`;
  return label.length > 14 ? `${firstCap.slice(0, 10)} ${last.charAt(0).toUpperCase()}.` : label;
}

const ParetoOperatorTypeChart: React.FC = () => {
  const { theme } = useTheme();
  const [rowsRaw, setRowsRaw] = useState<Operator[]>([]);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<TimeMode>('month');
  const [baseDate, setBaseDate] = useState<Date>(new Date());
  const [customStart, setCustomStart] = useState<Date | null>(null);
  const [customEnd, setCustomEnd] = useState<Date | null>(null);
  const [userPickedBase, setUserPickedBase] = useState<boolean>(false);
  const [selected, setSelected] = useState<SegmentInfo | null>(null);
  const [legendRevealAll, setLegendRevealAll] = useState<boolean>(false);
  const [layoutMode, setLayoutMode] = useState<'grouped'|'stacked'>('grouped');
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => { 
    let m = true; 
    (async () => { 
      try { 
        setLoading(true); 
        const ops = await operatorService.getAll(); 
        if (m) {
          const arr = ops as Operator[];
          setRowsRaw(arr);
          if (!userPickedBase && arr && arr.length > 0) {
            const latest = arr
              .map(o => normalizeDate(o.dateDetection))
              .filter((d): d is Date => !!d)
              .reduce<Date | null>((acc, d) => !acc || d > acc ? d : acc, null);
            if (latest) setBaseDate(latest);
          }
        }
      } finally { 
        if (m) setLoading(false); 
      } 
    })(); 
    return () => { m = false; }; 
  }, []);

  const range = useMemo(() => {
    if (mode === 'day') return { start: startOfDay(baseDate), end: endOfDay(baseDate) };
    if (mode === 'week') return getWeekRange(baseDate);
    if (mode === 'month') return getMonthRange(baseDate);
    return { start: customStart ? startOfDay(customStart) : null, end: customEnd ? endOfDay(customEnd) : null };
  }, [mode, baseDate, customStart, customEnd]);

  const filtered = useMemo(() => rowsRaw.filter(op => { const d = normalizeDate(op.dateDetection); if (!d) return false; if (range.start && d < range.start) return false; if (range.end && d > range.end) return false; return true; }), [rowsRaw, range]);

  const dataset = useMemo(() => {
    const byOperator = new Map<string, Map<string, number>>();
    const typeTotals = new Map<string, number>();
    filtered.forEach(op => { 
      const name = ((op.operateurNom || op.nom || 'Sans nom') as string).toString().trim(); 
      const type = (op.natureDefaut && op.natureDefaut.trim()) || labelFromCode(op.codeDefaut) || 'Autres'; 
      const occ = op.nombreOccurrences ? Number(op.nombreOccurrences) : 1; 
      if (!byOperator.has(name)) byOperator.set(name, new Map()); 
      const m = byOperator.get(name)!; 
      m.set(type, (m.get(type) || 0) + occ); 
      typeTotals.set(type, (typeTotals.get(type) || 0) + occ); 
    });
    const typeList = Array.from(typeTotals.entries()).sort((a,b)=>b[1]-a[1]).map(([t])=>t);
    const rows = Array.from(byOperator.entries()).map(([operator, typeMap]) => ({ operator, total: Array.from(typeMap.values()).reduce((s,v)=>s+v,0), typeMap })).sort((a,b)=>b.total-a.total);
    const grandTotal = rows.reduce((s,r)=>s+r.total,0);
    const maxTotal = Math.max(1, ...rows.map(r=>r.total));
    const colorMap = new Map<string,string>(); typeList.forEach((t,i)=>colorMap.set(t, PALETTE[i%PALETTE.length]));
    return { rows, typeList, colorMap, maxTotal, grandTotal };
  }, [filtered]);

  const chart = useMemo(() => {
    const bars = dataset.rows.length; 
    const barW = 28; 
    const gap = 20; 
    const left = 60; 
    const right = 60; 
    const contentW = left + right + Math.max(0, bars*(barW+gap)-gap); 
    const screenW = Dimensions.get('window').width;
    const baseW = Math.max(screenW, 380);
    const svgWidth = Math.max(contentW, baseW); 
    const scaleTop = 40; 
    const scaleBottom = 360; 
    const scaleH = scaleBottom - scaleTop; 
    return { barW, gap, left, right, svgWidth, height: 460, scaleTop, scaleBottom, scaleH };
  }, [dataset.rows.length]);

  const rangeText = (range.start || range.end) ? `${range.start?fmt(range.start):'…'} - ${range.end?fmt(range.end):'…'}` : 'Aucune période';

  useEffect(() => {
    anim.setValue(0);
    Animated.timing(anim, { toValue: 1, duration: 900, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start();
  }, [dataset.rows.length, chart.svgWidth]);

  return (
    <View style={[styles.container, { backgroundColor: theme.surface, borderColor: theme.border }]}> 
      <Text style={[styles.title, { color: theme.textPrimary }]}>Pareto of Defects by Operator and Type</Text>

      <View style={styles.filtersRow}>
        <View style={styles.modeRow}>
          {(['day','week','month','custom'] as TimeMode[]).map(m => (
            <TouchableOpacity key={m} onPress={() => setMode(m)} style={[styles.modeBtn, { backgroundColor: mode===m?theme.primary:theme.surfaceSecondary, borderColor: theme.border }]}>
              <Text style={[styles.modeBtnText, { color: mode===m?'white':theme.textPrimary }]}>{m==='day'?'Jour':m==='week'?'Semaine':m==='month'?'Mois':'Perso'}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <View style={styles.datePickers}>
          {(mode==='day'||mode==='week'||mode==='month') && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <DatePickerWeb value={baseDate} mode="date" onChange={(_,d)=>{ if(d){ setBaseDate(d); setUserPickedBase(true);} }} />
              <TouchableOpacity onPress={()=>setLegendRevealAll(v=>!v)} style={[styles.cumulativeBtn, { backgroundColor: legendRevealAll?theme.primary:theme.surfaceSecondary }]}> 
                <Feather name="tag" size={16} color={legendRevealAll?'white':theme.textSecondary} />
                <Text style={[styles.cumulativeText, { color: legendRevealAll?'white':theme.textSecondary }]}>{legendRevealAll? 'Masquer types' : 'Afficher types'}</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={()=>setLayoutMode(m=>m==='grouped'?'stacked':'grouped')} style={[styles.cumulativeBtn, { backgroundColor: theme.surfaceSecondary }]}> 
                <Feather name="layers" size={16} color={theme.textSecondary} />
                <Text style={[styles.cumulativeText, { color: theme.textSecondary }]}>{layoutMode==='grouped'?'Groupé':'Empilé'}</Text>
              </TouchableOpacity>
            </View>
          )}
          {mode==='custom' && (
            <View style={[styles.customRange, { alignItems: 'center' }]}>
              <View style={styles.customDate}><DatePickerWeb value={customStart || new Date()} mode="date" onChange={(_,d)=>setCustomStart(d||null)} /></View>
              <View style={styles.customDate}><DatePickerWeb value={customEnd || new Date()} mode="date" onChange={(_,d)=>setCustomEnd(d||null)} /></View>
              <TouchableOpacity onPress={()=>setLegendRevealAll(v=>!v)} style={[styles.cumulativeBtn, { backgroundColor: legendRevealAll?theme.primary:theme.surfaceSecondary, marginLeft: 8 }]}> 
                <Feather name="tag" size={16} color={legendRevealAll?'white':theme.textSecondary} />
                <Text style={[styles.cumulativeText, { color: legendRevealAll?'white':theme.textSecondary }]}>{legendRevealAll? 'Masquer types' : 'Afficher types'}</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={()=>setLayoutMode(m=>m==='grouped'?'stacked':'grouped')} style={[styles.cumulativeBtn, { backgroundColor: theme.surfaceSecondary, marginLeft: 4 }]}> 
                <Feather name="layers" size={16} color={theme.textSecondary} />
                <Text style={[styles.cumulativeText, { color: theme.textSecondary }]}>{layoutMode==='grouped'?'Groupé':'Empilé'}</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>

      <Text style={[styles.subTitle, { color: theme.textSecondary }]}>{rangeText}</Text>

      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <Svg width={chart.svgWidth} height={chart.height}>
          {[1,2,3,4,5,6,7].map((tick,i)=>(
            <AnimatedLine
              key={i}
              x1={60}
              y1={chart.scaleBottom-(tick/7)*chart.scaleH}
              x2={Animated.add(60, Animated.multiply(anim, chart.svgWidth-100))}
              y2={chart.scaleBottom-(tick/7)*chart.scaleH}
              stroke={theme.borderLight}
              strokeWidth={1}
              strokeDasharray="3,3"
              opacity={0.6}
            />
          ))}
          <AnimatedLine x1={60} y1={chart.scaleTop} x2={60} y2={Animated.add(chart.scaleTop, Animated.multiply(anim, chart.scaleH))} stroke={theme.textSecondary} strokeWidth={2} />
          {[1,2,3,4,5,6,7].map((tick,i)=>(
            <AnimatedSvgText key={i} x={50} y={chart.scaleBottom-(tick/7)*chart.scaleH+6} textAnchor="end" fontSize={12} fill={theme.textSecondary} fontWeight="500" opacity={anim}>{tick}</AnimatedSvgText>
          ))}
          <AnimatedLine x1={60} y1={chart.scaleBottom} x2={Animated.add(60, Animated.multiply(anim, chart.svgWidth-100))} y2={chart.scaleBottom} stroke={theme.textSecondary} strokeWidth={2} />

          {dataset.rows.map((row, idx) => { 
            const x = 60 + idx*(chart.barW+chart.gap); 
            const scaleMax = 7;
            const totalDisplay = Math.min(row.total, scaleMax);
            const totalHBase = (totalDisplay/scaleMax)*chart.scaleH; 
            const label = shortOperatorName(row.operator);
            const rotate = dataset.rows.length > 7 || label.length > 10;
            const labelX = x + chart.barW/2;
            const labelY = chart.scaleBottom + 18;
            const showTotals = dataset.rows.length <= 12;
            if (layoutMode === 'stacked') {
              let accBase = 0;
              let remaining = scaleMax;
              const parts = (dataset.typeList.length?dataset.typeList:['Autres']).map(t=>{ 
                const c = row.typeMap.get(t)||0; 
                const used = Math.min(c, remaining);
                const hBase = (used/scaleMax)*chart.scaleH; 
                const h = Animated.multiply(anim, hBase);
                const y = Animated.subtract(chart.scaleBottom - accBase, h); 
                accBase += hBase;
                remaining -= used;
                const color = dataset.colorMap.get(t) || PALETTE[0]; 
                return (
                  <G key={`${row.operator}-${t}`}>
                    <AnimatedRect x={x} y={y as any} width={chart.barW} height={h as any} fill={color} opacity={0.9} rx={3} onPress={()=>setSelected({ operator: row.operator, type: t, count: c })} />
                  </G>
                ); 
              }); 
              return (
                <G key={`bar-${idx}`}>
                  {parts}
                  {showTotals && (
                    <AnimatedSvgText x={x+chart.barW/2} y={Math.max(chart.scaleTop+6, chart.scaleBottom-totalHBase-8)} textAnchor="middle" fontSize={12} fill={theme.textPrimary} fontWeight="bold" opacity={anim}>{row.total}</AnimatedSvgText>
                  )}
                  <AnimatedSvgText x={labelX} y={labelY} textAnchor={rotate? 'end' : 'middle'} fontSize={12} fill={theme.textPrimary} fontWeight="bold" transform={rotate ? `rotate(-45 ${labelX} ${labelY})` : undefined as any} opacity={anim}>{label}</AnimatedSvgText>
                </G>
              );
            } else {
              const types = (dataset.typeList.length?dataset.typeList:['Autres']);
              const groupN = types.length;
              const innerGap = Math.max(2, Math.min(6, Math.floor(chart.barW / 8)));
              const groupBarW = Math.max(2, Math.floor((chart.barW - innerGap * (groupN - 1)) / groupN));
              let maxHBase = 0;
              const parts = types.map((t, i) => {
                const c = row.typeMap.get(t) || 0;
                const used = Math.min(c, scaleMax);
                const hBase = (used / scaleMax) * chart.scaleH;
                if (hBase > maxHBase) maxHBase = hBase;
                const h = Animated.multiply(anim, hBase);
                const bx = x + i * (groupBarW + innerGap);
                const y = Animated.subtract(chart.scaleBottom, h);
                const color = dataset.colorMap.get(t) || PALETTE[i % PALETTE.length];
                return (
                  <G key={`${row.operator}-${t}`}>
                    <AnimatedRect x={bx} y={y as any} width={groupBarW} height={h as any} fill={color} opacity={0.9} rx={3} onPress={()=>setSelected({ operator: row.operator, type: t, count: c })} />
                  </G>
                );
              });
              const labelTop = Math.max(chart.scaleTop + 6, chart.scaleBottom - maxHBase - 8);
              return (
                <G key={`bar-${idx}`}>
                  {parts}
                  {showTotals && (
                    <AnimatedSvgText x={x + chart.barW / 2} y={labelTop} textAnchor="middle" fontSize={12} fill={theme.textPrimary} fontWeight="bold" opacity={anim}>{row.total}</AnimatedSvgText>
                  )}
                  <AnimatedSvgText x={labelX} y={labelY} textAnchor={rotate? 'end' : 'middle'} fontSize={12} fill={theme.textPrimary} fontWeight="bold" transform={rotate ? `rotate(-45 ${labelX} ${labelY})` : undefined as any} opacity={anim}>{label}</AnimatedSvgText>
                </G>
              );
            }
          })}
        </Svg>
      </ScrollView>

      {selected && (
        <View style={[styles.tooltip, { backgroundColor: theme.surfaceSecondary, borderColor: theme.border }]}> 
          <Text style={[styles.tooltipTitle, { color: theme.textPrimary }]}>{selected.operator}</Text>
          <Text style={[styles.tooltipText, { color: theme.textSecondary }]}>Type: <Text style={{ color: theme.textPrimary, fontWeight: '600' }}>{selected.type}</Text></Text>
          <Text style={[styles.tooltipText, { color: theme.textSecondary }]}>Défauts: <Text style={{ color: theme.textPrimary, fontWeight: '600' }}>{selected.count}</Text></Text>
          <Text style={[styles.tooltipText, { color: theme.textSecondary }]}>Période: <Text style={{ color: theme.textPrimary }}>{rangeText}</Text></Text>
          <TouchableOpacity onPress={()=>setSelected(null)} style={[styles.closeTip, { backgroundColor: theme.primary }]}><Text style={styles.closeTipText}>Fermer</Text></TouchableOpacity>
        </View>
      )}

      {legendRevealAll && (
        <Modal transparent visible={legendRevealAll} onRequestClose={() => setLegendRevealAll(false)}>
          <View style={styles.legendModalBackdrop}>
            <View style={[styles.legendModal, { backgroundColor: theme.surface, borderColor: theme.border }]}> 
              <Text style={[styles.legendModalTitle, { color: theme.textPrimary }]}>Types de défauts</Text>
              <ScrollView style={{ maxHeight: 320 }} contentContainerStyle={styles.legendModalList}>
                {dataset.typeList.map((t,i)=> (
                  <View key={t} style={styles.legendModalItem}>
                    <View style={[styles.legendColor, { backgroundColor: dataset.colorMap.get(t) || PALETTE[i%PALETTE.length] }]} />
                    <Text style={[styles.legendLabel, { color: theme.textPrimary }]}>{t}</Text>
                  </View>
                ))}
              </ScrollView>
              <TouchableOpacity onPress={()=>setLegendRevealAll(false)} style={[styles.closeTip, { backgroundColor: theme.primary, alignSelf: 'flex-end' }]}>
                <Text style={styles.closeTipText}>Fermer</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      )}

      {!loading && dataset.rows.length===0 && (
        <View style={styles.empty}> 
          <Feather name="bar-chart-2" size={28} color={theme.textTertiary} />
          <Text style={[styles.emptyText, { color: theme.textSecondary }]}>Aucune donnée pour cette période</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { width: '100%', alignSelf: 'stretch', marginBottom: spacing.md, padding: spacing.lg, borderRadius: borderRadius.lg, borderWidth: 1, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 2 },
  title: { fontSize: typography.fontSize.lg, fontWeight: 700 as any, textAlign: 'center', marginBottom: spacing.sm },
  subTitle: { fontSize: typography.fontSize.sm, textAlign: 'center', marginBottom: spacing.md },
  filtersRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm, marginBottom: spacing.sm, flexWrap: 'wrap' },
  modeRow: { flexDirection: 'row', gap: 6 },
  modeBtn: { paddingVertical: 6, paddingHorizontal: 10, borderRadius: 8, borderWidth: 1 },
  modeBtnText: { fontSize: typography.fontSize.sm, fontWeight: 600 as any },
  datePickers: { minWidth: 220 },
  customRange: { flexDirection: 'row', gap: 8 },
  customDate: { width: 150 },
  cumulativeBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  cumulativeText: { fontSize: typography.fontSize.sm, fontWeight: 600 as any },
  legend: { marginTop: spacing.sm },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, borderWidth: 1, marginRight: 8 },
  legendColor: { width: 12, height: 12, borderRadius: 6 },
  legendLabel: { fontSize: typography.fontSize.sm, fontWeight: 500 as any },
  tooltip: { marginTop: spacing.sm, padding: spacing.md, borderRadius: borderRadius.md, borderWidth: 1 },
  tooltipTitle: { fontSize: typography.fontSize.md, fontWeight: 700 as any, marginBottom: 4 },
  tooltipText: { fontSize: typography.fontSize.sm, marginBottom: 2 },
  closeTip: { marginTop: 6, alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 6 },
  closeTipText: { color: 'white', fontWeight: 600 as any },
  empty: { alignItems: 'center', paddingVertical: spacing.md },
  emptyText: { marginTop: 6 },
  legendModalBackdrop: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.3)' },
  legendModal: { width: 420, maxWidth: '90%', padding: spacing.lg, borderRadius: borderRadius.lg, borderWidth: 1 },
  legendModalTitle: { fontSize: typography.fontSize.md, fontWeight: 700 as any, marginBottom: spacing.sm },
  legendModalList: { paddingVertical: 4 },
  legendModalItem: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 6 },
});

export default ParetoOperatorTypeChart;

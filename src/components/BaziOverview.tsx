import type { BaziCalculationSuccess,BaziLuckCycle,HeavenlyStem } from '../calculation/bazi'
import { getTenGod } from '../calculation/bazi/rules'
import { Card,SectionHeading } from './UI'
export default function BaziOverview({result,cycle}:{result:BaziCalculationSuccess;cycle?:BaziLuckCycle}) {
 const {day,month}=result.pillars
 const notes=result.birthTimeCorrection?.notes ?? []
 return <Card><SectionHeading title="命盘速览" />
  <p>{day.status==='available' ? `你的日主是${day.gan}，五行属${day.fiveElements.stem}。` : '出生时间不足以唯一确定日主。'}</p>
  <p>{month.status==='available' ? `出生时的月令为${month.zhi}，月柱为${month.ganZhi}。` : '出生日期处于月令边界，需要确认时间。'}</p>
  <p>{cycle && day.status==='available' ? `当前大运为${cycle.ganZhi}，其天干${cycle.ganZhi[0]}相对日主为${getTenGod(day.gan,cycle.ganZhi[0] as HeavenlyStem)}。` : '当前大运需结合明确的出生时间确定。'}</p>
  <p>{notes.length ? notes.join('；') : '本次按所填出生信息排盘，未启用额外时间校正。'}</p>
 </Card>
}

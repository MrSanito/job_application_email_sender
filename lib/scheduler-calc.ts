import { CampaignCalculation, CampaignConfig, DaySchedulePreview, Lead } from '@/types';

export function calculateCampaignPlan(
  leads: Lead[],
  config: CampaignConfig
): CampaignCalculation {
  const validLeads = leads.filter((l) => l.status === 'valid');
  const totalLeadsCount = leads.length;
  const validLeadsCount = validLeads.length;

  const emailsPerDay = Math.max(1, config.emailsPerDay || 50);
  const batchesPerDay = Math.max(1, config.batchesPerDay || 1);
  const intervalSeconds = Math.max(5, config.intervalSeconds || 60);
  const jitter = Math.max(0, config.intervalJitterSeconds || 0);

  // If no leads, return defaults
  if (validLeadsCount === 0) {
    return {
      totalLeads: totalLeadsCount,
      validLeads: 0,
      invalidLeads: totalLeadsCount,
      emailsPerDay,
      emailsPerBatch: Math.ceil(emailsPerDay / batchesPerDay),
      totalBatches: 0,
      totalDaysToRun: 0,
      workDaysCount: 0,
      estimatedEndDate: 'N/A',
      dailyActiveSendingMinutes: Math.round((emailsPerDay * intervalSeconds) / 60),
      averageIntervalSeconds: intervalSeconds,
      deliverabilityScore: 'Optimal',
      deliverabilityAdvice: 'Upload leads to view campaign calculation.',
      schedulePreview: [],
    };
  }

  // Calculate days needed (business or calendar days)
  const workDaysNeeded = Math.ceil(validLeadsCount / emailsPerDay);
  const emailsPerBatch = Math.ceil(emailsPerDay / batchesPerDay);

  // Schedule preview generation
  const schedulePreview: DaySchedulePreview[] = [];
  let remainingLeads = validLeadsCount;
  let currentLeadIndex = 0;
  let currentDate = config.startDate ? new Date(config.startDate) : new Date();
  
  // Set to starting hour or next morning if late
  if (currentDate.getHours() >= 18) {
    currentDate.setDate(currentDate.getDate() + 1);
    currentDate.setHours(9, 0, 0, 0);
  }

  let scheduledDaysCount = 0;
  let calendarDaysOffset = 0;

  while (remainingLeads > 0 && scheduledDaysCount < 365) {
    const loopDate = new Date(currentDate);
    loopDate.setDate(loopDate.getDate() + calendarDaysOffset);
    calendarDaysOffset++;

    const dayOfWeekIndex = loopDate.getDay(); // 0 = Sun, 6 = Sat
    const isWeekend = dayOfWeekIndex === 0 || dayOfWeekIndex === 6;

    if (config.workDaysOnly && isWeekend) {
      continue;
    }

    scheduledDaysCount++;
    const dailyQuota = Math.min(remainingLeads, emailsPerDay);
    const dayBatches = [];

    let dayLeadsAssigned = 0;
    for (let b = 0; b < batchesPerDay && dayLeadsAssigned < dailyQuota; b++) {
      const batchQuota = Math.min(emailsPerBatch, dailyQuota - dayLeadsAssigned);
      if (batchQuota <= 0) break;

      const timing = config.batchTimings?.[b] || {
        batchNumber: b + 1,
        startTime: `${String(9 + b * 4).padStart(2, '0')}:00`,
        endTime: `${String(12 + b * 4).padStart(2, '0')}:00`,
      };

      const startIdx = currentLeadIndex + 1;
      const endIdx = currentLeadIndex + batchQuota;

      dayBatches.push({
        batchNumber: b + 1,
        timeWindow: `${timing.startTime} - ${timing.endTime}`,
        emailCount: batchQuota,
        leadRange: `#${startIdx} - #${endIdx}`,
        estimatedStartTime: `${loopDate.toISOString().split('T')[0]} ${timing.startTime}`,
      });

      currentLeadIndex += batchQuota;
      dayLeadsAssigned += batchQuota;
    }

    remainingLeads -= dailyQuota;

    const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    schedulePreview.push({
      dayNumber: scheduledDaysCount,
      dateStr: loopDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      dayOfWeek: daysOfWeek[dayOfWeekIndex],
      isWorkDay: !isWeekend,
      batches: dayBatches,
      dailyTotal: dailyQuota,
    });
  }

  const lastDay = schedulePreview[schedulePreview.length - 1];
  const estimatedEndDate = lastDay ? lastDay.dateStr : 'Today';

  // Deliverability calculations
  let deliverabilityScore: CampaignCalculation['deliverabilityScore'] = 'Optimal';
  let deliverabilityAdvice = 'Excellent settings! High domain safety and optimal deliverability.';

  if (emailsPerDay > 300 || intervalSeconds < 25) {
    deliverabilityScore = 'Aggressive';
    deliverabilityAdvice = '⚠️ High risk! Sending >300 mails/day or intervals <25s may trigger spam filters or domain throttling.';
  } else if (emailsPerDay > 150 || intervalSeconds < 40) {
    deliverabilityScore = 'High Volume';
    deliverabilityAdvice = '⚡ High volume sending. Recommended only if your domain and DKIM/SPF/DMARC are properly warmed up.';
  } else if (emailsPerDay > 80) {
    deliverabilityScore = 'Good';
    deliverabilityAdvice = '✅ Solid balance between daily outreach volume and sender reputation.';
  }

  const dailyActiveSendingMinutes = Math.round((emailsPerDay * intervalSeconds) / 60);

  return {
    totalLeads: totalLeadsCount,
    validLeads: validLeadsCount,
    invalidLeads: totalLeadsCount - validLeadsCount,
    emailsPerDay,
    emailsPerBatch,
    totalBatches: schedulePreview.reduce((acc, curr) => acc + curr.batches.length, 0),
    totalDaysToRun: schedulePreview.length,
    workDaysCount: scheduledDaysCount,
    estimatedEndDate,
    dailyActiveSendingMinutes,
    averageIntervalSeconds: intervalSeconds + (jitter > 0 ? jitter / 2 : 0),
    deliverabilityScore,
    deliverabilityAdvice,
    schedulePreview,
  };
}

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
  
  // Parse starting Date & Time accurately
  let currentDate = new Date();
  if (config.startDate) {
    // If YYYY-MM-DD format
    if (/^\d{4}-\d{2}-\d{2}$/.test(config.startDate)) {
      const [y, m, d] = config.startDate.split('-').map(Number);
      currentDate = new Date(y, m - 1, d);
    } else {
      const parsed = new Date(config.startDate);
      if (!isNaN(parsed.getTime())) currentDate = parsed;
    }
  }

  if (config.startTime && /^\d{1,2}:\d{2}$/.test(config.startTime)) {
    const [startH, startM] = config.startTime.split(':').map(Number);
    currentDate.setHours(startH, startM, 0, 0);
  } else if (!config.startDate && currentDate.getHours() >= 18) {
    // If running late today without custom date, advance to tomorrow 09:00 AM
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
    // Calculate base start hour for this day
    let baseStartHour = 9;
    let baseStartMinute = 0;
    if (scheduledDaysCount === 1 && config.startTime && /^\d{1,2}:\d{2}$/.test(config.startTime)) {
      const [sh, sm] = config.startTime.split(':').map(Number);
      baseStartHour = isNaN(sh) ? 9 : sh;
      baseStartMinute = isNaN(sm) ? 0 : sm;
    }

    // Determine interval spacing between batches (in minutes)
    // Default window spans up to ~19:00 (7 PM) or minimum 60 mins between batches
    const availableMinutes = Math.max(batchesPerDay * 60, (19 - baseStartHour) * 60 - baseStartMinute);
    const batchIntervalMinutes = Math.max(45, Math.floor(availableMinutes / batchesPerDay));

    for (let b = 0; b < batchesPerDay && dayLeadsAssigned < dailyQuota; b++) {
      const batchQuota = Math.min(emailsPerBatch, dailyQuota - dayLeadsAssigned);
      if (batchQuota <= 0) break;

      let startTimeStr = `${String(9 + b * 4).padStart(2, '0')}:00`;
      let endTimeStr = `${String(12 + b * 4).padStart(2, '0')}:00`;

      if (config.batchTimings?.[b]) {
        startTimeStr = config.batchTimings[b].startTime;
        endTimeStr = config.batchTimings[b].endTime;
      } else {
        const batchStartTotalMinutes = baseStartHour * 60 + baseStartMinute + (b * batchIntervalMinutes);
        const bStartH = Math.floor(batchStartTotalMinutes / 60) % 24;
        const bStartM = batchStartTotalMinutes % 60;
        
        const batchEndTotalMinutes = batchStartTotalMinutes + Math.min(60, batchIntervalMinutes);
        const bEndH = Math.floor(batchEndTotalMinutes / 60) % 24;
        const bEndM = batchEndTotalMinutes % 60;

        startTimeStr = `${String(bStartH).padStart(2, '0')}:${String(bStartM).padStart(2, '0')}`;
        endTimeStr = `${String(bEndH).padStart(2, '0')}:${String(bEndM).padStart(2, '0')}`;
      }

      const startIdx = currentLeadIndex + 1;
      const endIdx = currentLeadIndex + batchQuota;

      dayBatches.push({
        batchNumber: b + 1,
        timeWindow: `${startTimeStr} - ${endTimeStr}`,
        emailCount: batchQuota,
        leadRange: `#${startIdx} - #${endIdx}`,
        estimatedStartTime: `${loopDate.toISOString().split('T')[0]} ${startTimeStr}`,
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

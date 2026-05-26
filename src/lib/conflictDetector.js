/**
 * Detects conflicts between a new campaign config and existing campaigns.
 * Returns enriched conflict objects with severity, type, conflicting campaign ref, and resolution options.
 */
export function detectConflicts(newCampaign, existingCampaigns) {
  const conflicts = [];
  const { targetProducts = [], targetSegment, startDate, endDate, budgetCap = 0, discountValue = 0 } = newCampaign;

  existingCampaigns.forEach(existing => {
    const existingSkus = (existing.target_products || '').split(',').map(s => s.trim()).filter(Boolean);

    // SKU overlap
    if (targetProducts.length > 0 && existingSkus.length > 0) {
      const overlap = targetProducts.filter(sku => existingSkus.includes(sku));
      if (overlap.length > 0) {
        conflicts.push({
          id: `sku-${existing.id}`,
          type: 'SKU Overlap',
          severity: 'High',
          detail: `SKUs [${overlap.join(', ')}] are already targeted by "${existing.name}" (${existing.status}${existing.end_date ? `, ends ${existing.end_date}` : ''})`,
          conflictingCampaign: existing,
          overlappingSkus: overlap,
          resolutions: [
            { id: 'remove_skus', label: 'Remove conflicting SKUs from this promotion', action: 'remove_skus' },
            { id: 'pause_other', label: `Pause "${existing.name}"`, action: 'pause_other' },
            { id: 'reschedule', label: 'Schedule after conflict ends', action: 'reschedule' },
            { id: 'override', label: 'Override (accept risk)', action: 'override', isOverride: true },
          ],
        });
      }
    }

    // Audience overlap
    if (targetSegment && existing.target_segment && targetSegment === existing.target_segment &&
        targetSegment !== 'All Customers') {
      conflicts.push({
        id: `audience-${existing.id}`,
        type: 'Audience Overlap',
        severity: 'Medium',
        detail: `Segment "${targetSegment}" is also targeted by "${existing.name}" (${existing.status})`,
        conflictingCampaign: existing,
        resolutions: [
          { id: 'exclude_customers', label: 'Exclude already-targeted customers', action: 'exclude_customers' },
          { id: 'change_segment', label: 'Change target segment', action: 'change_segment' },
          { id: 'override', label: 'Override (accept risk)', action: 'override', isOverride: true },
        ],
      });
    }

    // Schedule overlap
    if (startDate && endDate && existing.start_date && existing.end_date) {
      const newStart = new Date(startDate);
      const newEnd = new Date(endDate);
      const exStart = new Date(existing.start_date);
      const exEnd = new Date(existing.end_date);
      if (newStart <= exEnd && newEnd >= exStart) {
        // Only flag as a distinct conflict if no SKU overlap already covers this campaign
        const alreadyFlagged = conflicts.some(c => c.conflictingCampaign?.id === existing.id && c.type === 'SKU Overlap');
        if (!alreadyFlagged) {
          conflicts.push({
            id: `schedule-${existing.id}`,
            type: 'Schedule Overlap',
            severity: 'Low',
            detail: `Overlaps with "${existing.name}" (${existing.start_date} – ${existing.end_date})`,
            conflictingCampaign: existing,
            resolutions: [
              { id: 'shift_start', label: 'Shift start date to after conflict period', action: 'shift_start' },
              { id: 'shorten_other', label: `Shorten "${existing.name}" duration`, action: 'shorten_other' },
              { id: 'override', label: 'Override (accept risk)', action: 'override', isOverride: true },
            ],
          });
        }
      }
    }

    // Discount stack — same segment AND schedule AND both have discounts
    if (
      targetSegment && existing.target_segment === targetSegment &&
      discountValue > 0 && existing.discount_value > 0 &&
      startDate && existing.start_date &&
      new Date(startDate) <= new Date(existing.end_date || '2099-12-31') &&
      new Date(endDate || '2099-12-31') >= new Date(existing.start_date)
    ) {
      const alreadyFlagged = conflicts.some(c => c.id === `audience-${existing.id}`);
      if (alreadyFlagged) {
        // Upgrade to also flag discount stack
        conflicts.push({
          id: `discount-${existing.id}`,
          type: 'Discount Stack',
          severity: 'High',
          detail: `Stacking ${discountValue}% discount on top of "${existing.name}"'s ${existing.discount_value}% may erode margin`,
          conflictingCampaign: existing,
          resolutions: [
            { id: 'set_exclusion', label: 'Set "not stackable" exclusion rule', action: 'set_exclusion' },
            { id: 'reduce_discount', label: `Reduce discount to safe level (~${Math.max(5, discountValue - existing.discount_value)}%)`, action: 'reduce_discount', safeDiscount: Math.max(5, discountValue - existing.discount_value) },
            { id: 'override', label: 'Override (accept risk)', action: 'override', isOverride: true },
          ],
        });
      }
    }
  });

  return conflicts;
}
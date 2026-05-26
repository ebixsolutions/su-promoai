import React from 'react';
import { useLang } from '@/lib/LanguageContext';

const typeConfig = {
  product_discount:       { label: 'Product Discount',  labelZh: '产品折扣',  bg: '#dbeafe', color: '#1d4ed8', border: '#bfdbfe' },
  shipping_discount:      { label: 'Shipping Discount', labelZh: '运费折扣',  bg: '#d1fae5', color: '#065f46', border: '#a7f3d0' },
  bundle_discount:        { label: 'Bundle Discount',   labelZh: '套装折扣',  bg: '#ede9fe', color: '#6d28d9', border: '#ddd6fe' },
  coupon_discount:        { label: 'Coupon Discount',   labelZh: '优惠券折扣', bg: '#fef9c3', color: '#854d0e', border: '#fef08a' },
  customer_group_discount:{ label: 'Customer Group',    labelZh: '客户群组',  bg: '#dcfce7', color: '#166534', border: '#bbf7d0' },
};

export default function PromotionTypeBadge({ type }) {
  const { lang } = useLang() || { lang: 'en' };
  const c = typeConfig[type] || typeConfig.product_discount;
  const label = lang === 'zh' ? c.labelZh : c.label;
  return (
    <span
      className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold whitespace-nowrap"
      style={{ background: c.bg, color: c.color, border: `1px solid ${c.border}` }}
    >
      {label}
    </span>
  );
}
/**
 * ВОЛГАСТРОЙ 76 — Единый расчетный модуль смет (estimateCalculator.ts)
 * Источник истины для расчетов в React AdminPanelModal.
 * Полное соответствие формулам vgs_calc_estimate_totals() в api/estimates_db.php.
 */

import { EstimateResult, ConfiguratorState } from '../types';

export interface EstimateMaterial {
  id?: string | number;
  name: string;
  unit: string;
  quantity: number;
  cost_price: number;
  unit_price: number;
  total_cost?: number;
  total_cost_price?: number;
}

export interface EstimateItem {
  id?: string | number;
  name: string;
  type?: string;
  unit: string;
  quantity: number;
  cost_price: number;
  unit_price: number;
  total_cost?: number;
  total_cost_price?: number;
  is_qty_locked?: number;
  materials?: EstimateMaterial[];
}

export interface EstimateSection {
  id?: string | number;
  name: string;
  title?: string;
  items: EstimateItem[];
  positions?: EstimateItem[];
  work_total?: number;
  mat_total?: number;
  section_total?: number;
  totalWork?: number;
  totalMaterials?: number;
  totalSum?: number;
}

export interface EstimateOption {
  id: string;
  name: string;
  checked: boolean;
}

export interface AdminEstimate {
  id: number | string;
  number: string;
  template_code?: string;
  status: 'draft' | 'calculating' | 'sent' | 'agreed' | 'approved' | 'rejected' | 'archived' | string;
  created_at?: string;
  updated_at?: string;
  customer_name: string;
  customer_phone: string;
  customer_email?: string;
  object_name: string;
  object_address: string;
  area: number;
  lead_time?: string;
  valid_until?: string;
  engineer_name?: string;
  comment?: string;
  notes?: string;
  category?: string;
  options?: EstimateOption[];
  sections: EstimateSection[];
  work_total: number;
  material_total: number;
  delivery_total: number;
  grand_total: number;
  work_cost_price: number;
  material_cost_price: number;
  expected_margin: number;
  // Aliases for compatibility
  title?: string;
  client_name?: string;
  client_phone?: string;
  client_address?: string;
  total_rub?: number;
  work_rub?: number;
  mat_rub?: number;
  delivery_rub?: number;
  overhead_rub?: number;
  profit_rub?: number;
}

/**
 * Округление до 2 знаков с учетом банковского эпсилона
 */
export function round2(n: number): number {
  return isNaN(n) || !isFinite(n) ? 0 : Math.round((n + Number.EPSILON) * 100) / 100;
}

/**
 * Безопасный парсинг чисел (поддержка пробелов и запятых)
 */
export function parseNumber(n: any, defaultValue = 0): number {
  if (typeof n === 'number') {
    return isNaN(n) || !isFinite(n) ? defaultValue : n;
  }
  if (n == null || n === '') {
    return defaultValue;
  }
  const s = String(n).replace(/\s+/g, '').replace(',', '.');
  const parsed = parseFloat(s);
  return isNaN(parsed) || !isFinite(parsed) ? defaultValue : parsed;
}

/**
 * Проверка принадлежности позиции к разделу логистики/доставки
 */
export function isDelivery(name: string): boolean {
  if (!name) return false;
  const lower = name.toLowerCase();
  return lower.includes('доставка') || lower.includes('логистика') || lower.includes('манипулятор');
}

/**
 * Главная функция расчета итогов сметы.
 * Соответствует логике PHP vgs_calc_estimate_totals() в estimates_db.php.
 */
export function calculateEstimateTotals<T extends Partial<AdminEstimate>>(estimate: T): T & AdminEstimate {
  let workCostPrice = 0;
  let workTotal = 0;
  let matCostPrice = 0;
  let matTotal = 0;
  let deliveryTotal = 0;

  const sections: EstimateSection[] = (estimate.sections || []).map((sec) => {
    let secWorkTotal = 0;
    let secMatTotal = 0;
    let secDeliveryTotal = 0;

    const rawItems = (sec.items || (sec as any).positions || []) as any[];

    const items: EstimateItem[] = rawItems.map((item) => {
      const qty = parseNumber(item.quantity ?? item.qty, 0);
      const unitPrice = parseNumber(item.unit_price ?? item.unitPrice, 0);
      const costPrice = parseNumber(item.cost_price ?? item.costPrice, 0);

      const itemTotalCost = round2(qty * unitPrice);
      const itemTotalCostPrice = round2(qty * costPrice);

      if (isDelivery(item.name)) {
        deliveryTotal = round2(deliveryTotal + itemTotalCost);
        secDeliveryTotal = round2(secDeliveryTotal + itemTotalCost);
      } else {
        workTotal = round2(workTotal + itemTotalCost);
        secWorkTotal = round2(secWorkTotal + itemTotalCost);
      }
      workCostPrice = round2(workCostPrice + itemTotalCostPrice);

      const rawMaterials = (item.materials || []) as any[];
      const materials: EstimateMaterial[] = rawMaterials.map((mat) => {
        const mQty = parseNumber(mat.quantity ?? mat.qty, 0);
        const mUnitPrice = parseNumber(mat.unit_price ?? mat.unitPrice, 0);
        const mCostPrice = parseNumber(mat.cost_price ?? mat.costPrice, 0);

        const mTotalCost = round2(mQty * mUnitPrice);
        const mTotalCostPrice = round2(mQty * mCostPrice);

        matTotal = round2(matTotal + mTotalCost);
        secMatTotal = round2(secMatTotal + mTotalCost);
        matCostPrice = round2(matCostPrice + mTotalCostPrice);

        return {
          ...mat,
          quantity: mQty,
          qty: mQty,
          unit_price: mUnitPrice,
          unitPrice: mUnitPrice,
          cost_price: mCostPrice,
          total_cost: mTotalCost,
          totalPrice: mTotalCost,
          total_cost_price: mTotalCostPrice,
        };
      });

      return {
        ...item,
        quantity: qty,
        qty,
        unit_price: unitPrice,
        unitPrice,
        cost_price: costPrice,
        total_cost: itemTotalCost,
        totalPrice: itemTotalCost,
        total_cost_price: itemTotalCostPrice,
        materials,
      };
    });

    const secSum = round2(secWorkTotal + secMatTotal + secDeliveryTotal);

    return {
      ...sec,
      name: sec.name || sec.title || '',
      title: sec.title || sec.name || '',
      items,
      positions: items,
      work_total: secWorkTotal,
      mat_total: secMatTotal,
      section_total: secSum,
      totalWork: secWorkTotal,
      totalMaterials: secMatTotal,
      totalSum: secSum,
    };
  });

  const overheadTotal = parseNumber(estimate.overhead_rub, 0);
  const profitTotal = parseNumber(estimate.profit_rub, 0);
  const deliveryFromEstimate = estimate.delivery_rub !== undefined ? parseNumber(estimate.delivery_rub, 0) : deliveryTotal;
  const finalDelivery = deliveryFromEstimate > 0 ? deliveryFromEstimate : deliveryTotal;

  const grandTotal = round2(workTotal + matTotal + finalDelivery + overheadTotal + profitTotal);
  const totalCostPrice = round2(workCostPrice + matCostPrice);
  const expectedMargin = round2(grandTotal - totalCostPrice);

  return {
    ...estimate,
    id: estimate.id ?? Date.now(),
    number: estimate.number || 'КП-ВГС',
    status: estimate.status || 'draft',
    customer_name: estimate.customer_name || estimate.client_name || '',
    customer_phone: estimate.customer_phone || estimate.client_phone || '',
    object_name: estimate.object_name || estimate.title || '',
    object_address: estimate.object_address || estimate.client_address || '',
    client_name: estimate.customer_name || estimate.client_name || '',
    client_phone: estimate.customer_phone || estimate.client_phone || '',
    title: estimate.object_name || estimate.title || '',
    client_address: estimate.object_address || estimate.client_address || '',
    area: parseNumber(estimate.area, 0),
    sections,
    work_total: workTotal,
    material_total: matTotal,
    delivery_total: finalDelivery,
    grand_total: grandTotal,
    work_rub: workTotal,
    mat_rub: matTotal,
    delivery_rub: finalDelivery,
    overhead_rub: overheadTotal,
    profit_rub: profitTotal,
    total_rub: grandTotal,
    work_cost_price: workCostPrice,
    material_cost_price: matCostPrice,
    expected_margin: expectedMargin,
  } as T & AdminEstimate;
}

// Псевдоним для calculateEstimateTotals
export const calculateTotals = calculateEstimateTotals;

/**
 * Пересчет сметы при пропорциональном изменении площади объекта
 */
export function scaleEstimateByArea(estimate: AdminEstimate, newAreaInput: number | string): AdminEstimate {
  const newArea = parseNumber(newAreaInput, 0);

  const updatedSections: EstimateSection[] = (estimate.sections || []).map((sec) => {
    const updatedItems: EstimateItem[] = (sec.items || []).map((item) => {
      if (item.is_qty_locked === 1) {
        return item;
      }

      let newQty = item.quantity;
      const lowerName = (item.name || '').toLowerCase();

      if (newArea > 0) {
        if (item.unit === 'м²') {
          newQty = newArea;
        } else if (lowerName.includes('свай')) {
          newQty = Math.ceil(newArea / 2.08);
        } else if (lowerName.includes('обвязк')) {
          newQty = Math.round(Math.sqrt(newArea) * 4 * 1.5);
        } else if (item.unit === 'м.п.') {
          newQty = Math.round(Math.sqrt(newArea) * 4);
        }
      }

      const updatedMaterials: EstimateMaterial[] = (item.materials || []).map((mat) => {
        if (newArea <= 0) return mat;
        let mQty = mat.quantity;
        if (
          (lowerName.includes('свай') && mat.unit === 'шт.') ||
          (lowerName.includes('обвязк') && mat.unit === 'м.п.')
        ) {
          mQty = newQty;
        }
        return {
          ...mat,
          quantity: mQty,
        };
      });

      return {
        ...item,
        quantity: newQty,
        materials: updatedMaterials,
      };
    });

    return {
      ...sec,
      items: updatedItems,
    };
  });

  const updatedEstimate: AdminEstimate = {
    ...estimate,
    area: newArea,
    sections: updatedSections,
  };

  return calculateEstimateTotals(updatedEstimate);
}

/**
 * Преобразование структуры AdminEstimate в формат EstimateResult для экспорта PDF/DOCX/XLSX
 */
export type EstimatePosition = EstimateItem;
export type MaterialItem = EstimateMaterial;

export function formatRub(val: number): string {
  const str = new Intl.NumberFormat('ru-RU', {
    maximumFractionDigits: 0,
  }).format(Math.round(val));
  return str.replace(/[\u00A0\u202F]/g, ' ') + ' ₽';
}

export function formatNum(val: number, maxDigits = 2): string {
  const str = new Intl.NumberFormat('ru-RU', {
    maximumFractionDigits: maxDigits,
  }).format(val);
  return str.replace(/[\u00A0\u202F]/g, ' ');
}

export function generateEstimateNumber(): string {
  const year = new Date().getFullYear();
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `КП-${year}-${rand}`;
}

export function formatAdminEstimateToResult(adminEstimate: AdminEstimate): {

  estimate: EstimateResult;
  config: ConfiguratorState;
} {
  const rows: any[] = [];
  let calculatedWorkCost = 0;
  let calculatedMatCost = 0;

  (adminEstimate.sections || []).forEach((sec) => {
    rows.push({
      name: sec.name || 'РАЗДЕЛ СМЕТЫ',
      kind: 'h',
      cost: 0,
      note: '',
    });

    (sec.items || []).forEach((item) => {
      const qty = parseNumber(item.quantity, 1);
      const unitPrice = parseNumber(item.unit_price, 0);
      const cost = parseNumber(item.total_cost, qty * unitPrice);

      calculatedWorkCost += cost;
      rows.push({
        name: item.name || 'Строительно-монтажная работа',
        kind: 'w',
        volume: qty,
        unit: item.unit || 'компл.',
        unitPrice: unitPrice,
        cost: cost,
        marketPrice: Math.round(unitPrice * 1.15),
        note: 'Монтажные работы ВОЛГАСТРОЙ 76',
      });

      (item.materials || []).forEach((mat) => {
        const mQty = parseNumber(mat.quantity, 1);
        const mUnitPrice = parseNumber(mat.unit_price, 0);
        const mCost = parseNumber(mat.total_cost, mQty * mUnitPrice);

        calculatedMatCost += mCost;
        rows.push({
          name: `↳ ${mat.name || 'Материал'}`,
          kind: 'm',
          volume: mQty,
          unit: mat.unit || 'шт.',
          unitPrice: mUnitPrice,
          cost: mCost,
          marketPrice: Math.round(mUnitPrice * 1.12),
          note: 'Сертифицированные материалы',
        });
      });
    });
  });

  const workCost =
    typeof adminEstimate.work_total === 'number' && adminEstimate.work_total > 0
      ? adminEstimate.work_total
      : calculatedWorkCost;

  const matCost =
    typeof adminEstimate.material_total === 'number' && adminEstimate.material_total > 0
      ? adminEstimate.material_total
      : calculatedMatCost;

  const totalCost =
    typeof adminEstimate.grand_total === 'number' && adminEstimate.grand_total > 0
      ? adminEstimate.grand_total
      : workCost + matCost;

  const areaStr = adminEstimate.area ? `${adminEstimate.area} м²` : '';
  const objAddress = adminEstimate.object_address || 'Ярославская область';

  const subtitleParts = [
    `Номер предложения: ${adminEstimate.number || 'КП-ВГС'}`,
    areaStr ? `Площадь: ${areaStr}` : null,
    `Объект: ${objAddress}`,
    adminEstimate.customer_name ? `Заказчик: ${adminEstimate.customer_name}` : null,
  ].filter(Boolean);

  const estimateResult: EstimateResult = {
    title: adminEstimate.object_name || 'Коммерческое предложение ВОЛГАСТРОЙ 76',
    subtitle: subtitleParts.join(' | '),
    totalCost: totalCost,
    workCost: workCost,
    materialCost: matCost,
    rows: rows,
  };

  const configuratorState: ConfiguratorState = {
    category: 'house',
    houseArea: adminEstimate.area || 50,
    houseKit: 'turnkey',
    houseMaterial: 'wood',
    houseFund: true,
    houseCrane: true,
    houseMatInclude: true,

    poolPavilion: 'none',
    poolPipe: true,
    poolTech: false,
    poolDeck: false,

    deckArea: 30,
    deckLayout: 'straight',
    deckSteps: 0,
    deckPiles: true,
    deckRail: false,

    pileCount: 16,
    pileDia: '108',
    pileRostverk: true,
    pileFill: true,

    netLength: 20,
    netType: 'both',
    netDeep: true,
    netWells: 1,
    netHasWells: false,
    netWellsCount: 0,
    netHeating: false,
    netHeatingLength: 0,
    netHeatingChambers: false,
    netHeatingChambersCount: 0,
    netStorm: false,
    netStormLength: 0,
    netStormInlets: false,
    netStormInletsCount: 0,

    finishArea: adminEstimate.area || 50,
    finishLevel: 'base',
    finishFloor: false,
    finishWarm: false,
    finishElectric: false,
  };

  return {
    estimate: estimateResult,
    config: configuratorState,
  };
}

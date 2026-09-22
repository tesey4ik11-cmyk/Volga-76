import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  X,
  ArrowLeft,
  Check,
  Plus,
  Trash2,
  Edit3,
  Lock,
  Unlock,
  Eye,
  EyeOff,
  Search,
  Filter,
  FileText,
  Download,
  RotateCcw,
  Clock,
  Phone,
  MapPin,
  Star,
  AlertCircle,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Copy,
  RefreshCw,
  Send,
  CheckCircle2,
  Shield,
  User,
  Building,
  HardHat,
  Share2,
  Layers,
  Wrench,
  Package,
  TrendingUp,
} from 'lucide-react';
import {
  AdminEstimate,
  EstimateSection,
  EstimateItem,
  EstimateMaterial,
  calculateEstimateTotals,
  scaleEstimateByArea,
  parseNumber,
  round2,
  formatAdminEstimateToResult,
} from '../utils/estimateCalculator';
import { ESTIMATE_TEMPLATES, EstimateTemplate } from '../data/estimateTemplates';
import {
  downloadCommercialProposalPdf,
  exportEstimateExcel,
} from '../lib/exportEstimate';

declare global {
  interface Window {
    VgsDocExport?: {
      downloadEstimateDocx?: (estimate: any) => Promise<void>;
      downloadEstimatePdf?: (estimate: any) => Promise<void>;
      downloadEstimateXlsx?: (estimate: any) => Promise<void>;
    };
    VGS_DOCS?: any;
  }
}

interface AdminPanelModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface HistoryItem {
  id: number | string;
  admin_id?: number;
  admin_name?: string;
  action_type?: string;
  entity_type?: string;
  entity_id?: number | string;
  entity_name?: string;
  snapshot_before?: any;
  created_at?: string;
  undone_at?: string;
  title: string;
  type: string;
  action: string;
  time: string;
  data?: any;
  meta?: any;
  details?: string;
}

interface LeadItem {
  id: number | string;
  name: string;
  phone: string;
  topic?: string;
  message?: string;
  calc?: string;
  status: 'new' | 'viewed' | 'archived' | string;
  created_at: string;
}

interface ReviewItem {
  id: number | string;
  author_name: string;
  object_type?: string;
  rating: number;
  review_text: string;
  approved: boolean;
  created_at?: string;
}

export const AdminPanelModal: React.FC<AdminPanelModalProps> = ({ isOpen, onClose }) => {
  // --- Авторизация ---
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    try {
      return sessionStorage.getItem('vgs_admin_auth') === 'true';
    } catch {
      return false;
    }
  });
  const [loginUser, setLoginUser] = useState('');
  const [loginPass, setLoginPass] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState('');

  // --- Навигация и вкладки ---
  const [activeTab, setActiveTab] = useState<'estimates' | 'leads' | 'reviews' | 'history'>('estimates');
  const [isLoading, setIsLoading] = useState(false);

  // --- Списки сущностей ---
  const [estimates, setEstimates] = useState<AdminEstimate[]>([]);
  const [leads, setLeads] = useState<LeadItem[]>([]);
  const [reviews, setReviews] = useState<ReviewItem[]>([]);
  const [historyItems, setHistoryItems] = useState<HistoryItem[]>([]);

  // --- Редактор сметы ---
  const [currentEstimate, setCurrentEstimate] = useState<AdminEstimate | null>(null);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'dirty' | 'saving' | 'saved' | 'error'>('idle');
  const [saveErrorMessage, setSaveErrorMessage] = useState('');

  // --- Сворачиваемые секции сметы (по умолчанию 1-я открыта) ---
  const [openSections, setOpenSections] = useState<Record<number, boolean>>({ 0: true });

  // --- Развернутые материалы для работ ---
  const [openMaterials, setOpenMaterials] = useState<Record<string, boolean>>({});

  // --- Модальные диалоги и Bottom Sheets ---
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [showFilterSheet, setShowFilterSheet] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [showAddReviewModal, setShowAddReviewModal] = useState(false);
  const [editingWorkTarget, setEditingWorkTarget] = useState<{ sectionIdx: number; itemIdx: number } | null>(null);
  const [addingWorkSectionIdx, setAddingWorkSectionIdx] = useState<number | null>(null);
  const [confirmDeleteSectionIdx, setConfirmDeleteSectionIdx] = useState<number | null>(null);
  const [mobileTotalsDrawerOpen, setMobileTotalsDrawerOpen] = useState(false);

  // --- Поиск и фильтры смет ---
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [leadStatusFilter, setLeadStatusFilter] = useState('all');

  // --- Форма добавления отзыва ---
  const [revAuthor, setRevAuthor] = useState('');
  const [revObject, setRevObject] = useState('');
  const [revRating, setRevRating] = useState(5);
  const [revText, setRevText] = useState('');
  const [revApproved, setRevApproved] = useState(true);

  // --- Уведомления (Toast / Snackbar) ---
  const [toastMessage, setToastMessage] = useState('');
  const [toastUndoAction, setToastUndoAction] = useState<(() => void) | null>(null);
  const toastTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // --- VisualViewport и адаптация клавиатуры ---
  const [viewportHeight, setViewportHeight] = useState<number | null>(null);
  const [keyboardHeight, setKeyboardHeight] = useState<number>(0);
  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);
  const modalContainerRef = useRef<HTMLDivElement | null>(null);

  // --- Определение типа экрана ---
  const [isMobile, setIsMobile] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth <= 768;
    }
    return false;
  });

  const showToast = useCallback((msg: string, undoCallback?: () => void) => {
    setToastMessage(msg);
    setToastUndoAction(undoCallback ? () => undoCallback : null);
    if (toastTimeoutRef.current) {
      clearTimeout(toastTimeoutRef.current);
    }
    toastTimeoutRef.current = setTimeout(() => {
      setToastMessage('');
      setToastUndoAction(null);
    }, 5500);
  }, []);

  // Отслеживание ширины экрана
  useEffect(() => {
    const checkWidth = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    window.addEventListener('resize', checkWidth);
    return () => window.removeEventListener('resize', checkWidth);
  }, []);

  // Отслеживание VisualViewport (Клавиатура на мобильных устройствах)
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleVisualViewportChange = () => {
      if (window.visualViewport) {
        const vv = window.visualViewport;
        const vh = vv.height;
        setViewportHeight(vh);

        const diff = Math.max(0, window.innerHeight - vh);
        // Клавиатура обычно занимает > 120px
        const kbActive = diff > 120;
        setKeyboardHeight(diff);
        setIsKeyboardOpen(kbActive);
      } else {
        setViewportHeight(window.innerHeight);
        setKeyboardHeight(0);
        setIsKeyboardOpen(false);
      }
    };

    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', handleVisualViewportChange);
      window.visualViewport.addEventListener('scroll', handleVisualViewportChange);
    }
    window.addEventListener('resize', handleVisualViewportChange);
    handleVisualViewportChange();

    return () => {
      if (window.visualViewport) {
        window.visualViewport.removeEventListener('resize', handleVisualViewportChange);
        window.visualViewport.removeEventListener('scroll', handleVisualViewportChange);
      }
      window.removeEventListener('resize', handleVisualViewportChange);
    };
  }, []);

  // Умный скролл активного инпута в центр видимой области
  const handleInputFocus = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const target = e.target;
    setTimeout(() => {
      try {
        target.scrollIntoView({ behavior: 'smooth', block: 'center' });
      } catch {
        // fallback
      }
    }, 280);
  };

  // Android Back & Escape обработка
  useEffect(() => {
    if (!isOpen) return;

    // Регистрация состояния в истории для поддержки кнопки «Назад»
    try {
      window.history.pushState({ vgsAdminLevel: 'modal' }, '');
    } catch {}

    const handlePopState = (event: PopStateEvent) => {
      // Иерархическое закрытие уровней
      if (showFilterSheet) {
        setShowFilterSheet(false);
        return;
      }
      if (showTemplateModal) {
        setShowTemplateModal(false);
        return;
      }
      if (showHistoryModal) {
        setShowHistoryModal(false);
        return;
      }
      if (showAddReviewModal) {
        setShowAddReviewModal(false);
        return;
      }
      if (editingWorkTarget) {
        setEditingWorkTarget(null);
        return;
      }
      if (addingWorkSectionIdx !== null) {
        setAddingWorkSectionIdx(null);
        return;
      }
      if (confirmDeleteSectionIdx !== null) {
        setConfirmDeleteSectionIdx(null);
        return;
      }
      if (mobileTotalsDrawerOpen) {
        setMobileTotalsDrawerOpen(false);
        return;
      }
      if (currentEstimate) {
        // Если открыт редактор сметы — возвращаемся к списку смет
        setCurrentEstimate(null);
        return;
      }

      // Если ничего не открыто внутри — закрываем панель
      onClose();
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (showFilterSheet) {
          setShowFilterSheet(false);
          return;
        }
        if (showTemplateModal) {
          setShowTemplateModal(false);
          return;
        }
        if (showHistoryModal) {
          setShowHistoryModal(false);
          return;
        }
        if (showAddReviewModal) {
          setShowAddReviewModal(false);
          return;
        }
        if (editingWorkTarget) {
          setEditingWorkTarget(null);
          return;
        }
        if (addingWorkSectionIdx !== null) {
          setAddingWorkSectionIdx(null);
          return;
        }
        if (confirmDeleteSectionIdx !== null) {
          setConfirmDeleteSectionIdx(null);
          return;
        }
        if (currentEstimate) {
          setCurrentEstimate(null);
          return;
        }
        onClose();
      }
    };

    window.addEventListener('popstate', handlePopState);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('popstate', handlePopState);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [
    isOpen,
    showFilterSheet,
    showTemplateModal,
    showHistoryModal,
    showAddReviewModal,
    editingWorkTarget,
    addingWorkSectionIdx,
    confirmDeleteSectionIdx,
    mobileTotalsDrawerOpen,
    currentEstimate,
    onClose,
  ]);

  // Проверка сессии на сервере при открытии
  useEffect(() => {
    if (isOpen) {
      (async () => {
        try {
          const res = await fetch('/api/admin.php?action=check_auth', {
            credentials: 'same-origin',
          });
          if (res.ok) {
            const data = await res.json();
            if (data.ok && data.authenticated) {
              setIsAuthenticated(true);
              try {
                sessionStorage.setItem('vgs_admin_auth', 'true');
              } catch {}
            }
          }
        } catch (err) {
          console.warn('Проверка авторизации:', err);
        }
      })();
    }
  }, [isOpen]);

  // Загрузка данных с сервера
  const loadAllData = useCallback(async () => {
    if (!isAuthenticated) return;
    setIsLoading(true);
    try {
      // 1. Сметы
      try {
        const estRes = await fetch(`/api/admin-estimates.php?action=list&t=${Date.now()}`, {
          credentials: 'same-origin',
        });
        if (estRes.ok) {
          const data = await estRes.json();
          if (data.ok && Array.isArray(data.list)) {
            setEstimates(data.list);
          }
        } else if (estRes.status === 401) {
          setIsAuthenticated(false);
          try {
            sessionStorage.removeItem('vgs_admin_auth');
          } catch {}
          return;
        }
      } catch (e) {
        console.warn('Ошибка загрузки смет:', e);
      }

      // 2. Заявки
      try {
        const leadsRes = await fetch(`/api/admin.php?action=leads&t=${Date.now()}`, {
          credentials: 'same-origin',
        });
        if (leadsRes.ok) {
          const data = await leadsRes.json();
          if (data.ok && Array.isArray(data.leads)) {
            setLeads(data.leads);
          }
        }
      } catch (e) {
        console.warn('Ошибка загрузки заявок:', e);
      }

      // 3. Отзывы
      try {
        const revRes = await fetch(`/api/admin.php?action=reviews&t=${Date.now()}`, {
          credentials: 'same-origin',
        });
        if (revRes.ok) {
          const data = await revRes.json();
          if (data.ok && Array.isArray(data.reviews)) {
            setReviews(data.reviews);
          }
        }
      } catch (e) {
        console.warn('Ошибка загрузки отзывов:', e);
      }

      // 4. История
      try {
        const histRes = await fetch(`/api/admin.php?action=history&t=${Date.now()}`, {
          credentials: 'same-origin',
        });
        if (histRes.ok) {
          const data = await histRes.json();
          if (data.ok && Array.isArray(data.history)) {
            const mapped = data.history.map((item: any) => ({
              id: item.id,
              admin_id: item.admin_id,
              admin_name: item.admin_name,
              action_type: item.action_type,
              entity_type: item.entity_type,
              entity_id: item.entity_id,
              entity_name: item.entity_name,
              snapshot_before: item.before_data,
              created_at: item.created_at,
              undone_at: item.undone_at,
              title: `${item.action_type === 'delete' ? 'Удалено' : item.action_type === 'edit' ? 'Изменено' : item.action_type === 'status' ? 'Смена статуса' : 'Создано'}: ${item.entity_name || item.entity_type}`,
              type: item.entity_type,
              action: item.action_type,
              time: item.created_at
                ? new Date(item.created_at).toLocaleTimeString('ru-RU', {
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                  })
                : '',
              data: item.before_data,
              details: item.entity_name,
            }));
            setHistoryItems(mapped);
          }
        }
      } catch (e) {
        console.warn('Ошибка истории:', e);
      }
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (isOpen && isAuthenticated) {
      loadAllData();
    }
  }, [isOpen, isAuthenticated, loadAllData]);

  // Вход в систему
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    setIsLoading(true);
    try {
      const res = await fetch('/api/admin.php?action=login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({
          username: loginUser.trim(),
          password: loginPass,
        }),
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        setIsAuthenticated(true);
        try {
          sessionStorage.setItem('vgs_admin_auth', 'true');
        } catch {}
        showToast('Авторизация успешна. Добро пожаловать!');
        setLoginPass('');
        loadAllData();
      } else {
        setLoginError(data.err || data.error || 'Неверный логин или пароль администратора');
      }
    } catch {
      setLoginError('Ошибка подключения к серверу API.');
    } finally {
      setIsLoading(false);
    }
  };

  // Выход из системы
  const handleLogout = async () => {
    try {
      await fetch('/api/admin.php?action=logout', { credentials: 'same-origin' });
    } catch {}
    setIsAuthenticated(false);
    try {
      sessionStorage.removeItem('vgs_admin_auth');
    } catch {}
    setLoginUser('');
    setLoginPass('');
    showToast('Вы вышли из панели управления.');
  };

  // Отмена действия (Undo) через серверное API
  const handleUndo = async (itemOrId: any) => {
    const id = typeof itemOrId === 'object' ? itemOrId.id : itemOrId;
    if (typeof id === 'number' || (typeof id === 'string' && /^\d+$/.test(id))) {
      setIsLoading(true);
      try {
        const res = await fetch('/api/admin.php?action=undo', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'same-origin',
          body: JSON.stringify({ history_id: Number(id) }),
        });
        const data = await res.json();
        if (res.ok && data.ok) {
          showToast(data.msg || 'Действие успешно отменено в базе данных!');
          await loadAllData();
          return;
        } else {
          showToast(data.err || 'Не удалось отменить действие на сервере');
        }
      } catch (err) {
        showToast('Ошибка сети при отмене действия');
      } finally {
        setIsLoading(false);
      }
    }

    // Восстановление локального раздела в редакторе
    if (typeof itemOrId === 'object' && itemOrId.type === 'section' && currentEstimate) {
      const sectionData = itemOrId.data;
      const targetIdx = itemOrId.meta?.idx ?? currentEstimate.sections.length;
      const updated = [...currentEstimate.sections];
      updated.splice(targetIdx, 0, sectionData);
      const recalculated = calculateEstimateTotals({ ...currentEstimate, sections: updated });
      setCurrentEstimate(recalculated);
      setSaveStatus('dirty');
      showToast(`Раздел "${sectionData.name}" восстановлен!`);
    }
  };

  // --- Операции со сметами ---

  // Создание сметы по шаблону
  const handleCreateFromTemplate = (template: EstimateTemplate) => {
    const defaultArea = template.defaultArea || 50;
    const newEst: AdminEstimate = {
      id: Date.now(),
      number: `КП-ВГС-${Math.floor(Math.random() * 900000 + 100000)}`,
      template_code: template.id,
      status: 'draft',
      created_at: new Date().toISOString().split('T')[0],
      customer_name: 'Новый заказчик',
      customer_phone: '+7 (___) ___-__-__',
      customer_email: '',
      object_name: template.name,
      object_address: 'Ярославская обл.',
      area: defaultArea,
      lead_time: '14-21 рабочий день',
      valid_until: new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0],
      engineer_name: 'Звонарёв А.Б. (СК Волгастрой 76)',
      comment: `Состав сметы: ${template.description || ''}`,
      options: [
        { id: 'opt_delivery', name: 'Доставка манипулятором на объект', checked: true },
        { id: 'opt_montage', name: 'Монтаж под ключ с гарантией 5 лет', checked: true },
        { id: 'opt_materials', name: 'Сертифицированные материалы по ГОСТ', checked: true },
        { id: 'opt_geo', name: 'Геодезическая разбивка и нивелирование лазерным уровнем', checked: true },
        { id: 'opt_qc', name: 'Акт скрытых работ с фотофиксацией узлов', checked: true },
      ],
      sections: JSON.parse(JSON.stringify(template.sections)),
      work_total: 0,
      material_total: 0,
      delivery_total: 0,
      grand_total: 0,
      work_cost_price: 0,
      material_cost_price: 0,
      expected_margin: 0,
    };

    const calculated = calculateEstimateTotals(newEst);
    setCurrentEstimate(calculated);
    setSaveStatus('dirty');
    setShowTemplateModal(false);
    setOpenSections({ 0: true });
    showToast(`Создана смета: ${template.name}`);
  };

  // Сохранение сметы в MySQL
  const handleSaveEstimate = async () => {
    if (!currentEstimate) return;
    const toSave = calculateEstimateTotals(currentEstimate);
    setSaveStatus('saving');
    setIsLoading(true);
    try {
      const res = await fetch('/api/admin-estimates.php?action=save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify(toSave),
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        setSaveStatus('saved');
        showToast(`Смета ${data.number || toSave.number} успешно сохранена в базе MySQL!`);
        // Обновляем id если был присвоен сервером
        if (data.id) {
          setCurrentEstimate({ ...toSave, id: data.id, number: data.number || toSave.number });
        }
        await loadAllData();
      } else {
        setSaveStatus('error');
        const err = data.err || data.error || 'Не удалось сохранить смету';
        setSaveErrorMessage(err);
        showToast(`Ошибка сохранения: ${err}`);
      }
    } catch (err) {
      setSaveStatus('error');
      setSaveErrorMessage('Ошибка сети при синхронизации с сервером');
      showToast('Ошибка сети при сохранении сметы в базу данных');
    } finally {
      setIsLoading(false);
    }
  };

  // Дублирование сметы
  const handleDuplicateEstimate = async (est: AdminEstimate) => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/admin-estimates.php?action=duplicate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ id: est.id }),
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        showToast(`Создана копия: ${data.number || est.number} в базе MySQL!`);
        await loadAllData();
      } else {
        showToast(`Ошибка: ${data.err || 'Не удалось скопировать смету'}`);
      }
    } catch {
      showToast('Ошибка сети при копировании сметы');
    } finally {
      setIsLoading(false);
    }
  };

  // Удаление сметы с регистрацией в истории
  const handleDeleteEstimate = async (id: number | string) => {
    const target = estimates.find((e) => e.id === id);
    if (!target) return;
    if (!confirm(`Вы уверены, что хотите удалить смету ${target.number}?`)) return;

    setIsLoading(true);
    try {
      const res = await fetch('/api/admin-estimates.php?action=delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ id }),
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        showToast(`Смета ${target.number} удалена из БД.`, data.history_id ? () => handleUndo(data.history_id) : undefined);
        await loadAllData();
      } else {
        showToast(`Ошибка удаления: ${data.err || 'Не удалось удалить смету'}`);
      }
    } catch {
      showToast('Ошибка сети при удалении сметы');
    } finally {
      setIsLoading(false);
    }
  };

  // Изменение площади объекта
  const handleAreaChange = (val: string) => {
    if (!currentEstimate) return;
    const scaled = scaleEstimateByArea(currentEstimate, val);
    setCurrentEstimate(scaled);
    setSaveStatus('dirty');
  };

  // Переключение фиксации объема работы (🔒 / 🔓)
  const handleToggleLockQty = (secIdx: number, itemIdx: number) => {
    if (!currentEstimate) return;
    const clone = JSON.parse(JSON.stringify(currentEstimate));
    const cur = clone.sections[secIdx].items[itemIdx].is_qty_locked;
    clone.sections[secIdx].items[itemIdx].is_qty_locked = cur ? 0 : 1;
    setCurrentEstimate(clone);
    setSaveStatus('dirty');
  };

  // Изменение поля работы в смете
  const handleWorkFieldChange = (secIdx: number, itemIdx: number, field: keyof EstimateItem, val: any) => {
    if (!currentEstimate) return;
    const clone = JSON.parse(JSON.stringify(currentEstimate));
    clone.sections[secIdx].items[itemIdx][field] = val;
    const recalculated = calculateEstimateTotals(clone);
    setCurrentEstimate(recalculated);
    setSaveStatus('dirty');
  };

  // Изменение поля материала
  const handleMaterialFieldChange = (
    secIdx: number,
    itemIdx: number,
    matIdx: number,
    field: keyof EstimateMaterial,
    val: any
  ) => {
    if (!currentEstimate) return;
    const clone = JSON.parse(JSON.stringify(currentEstimate));
    clone.sections[secIdx].items[itemIdx].materials[matIdx][field] = val;
    const recalculated = calculateEstimateTotals(clone);
    setCurrentEstimate(recalculated);
    setSaveStatus('dirty');
  };

  // Добавление новой работы в раздел
  const handleAddWork = (secIdx: number) => {
    if (!currentEstimate) return;
    const clone = JSON.parse(JSON.stringify(currentEstimate));
    clone.sections[secIdx].items.push({
      name: 'Новая строительно-монтажная работа',
      type: 'work',
      unit: 'компл.',
      quantity: 1,
      cost_price: 1500,
      unit_price: 2800,
      is_qty_locked: 0,
      materials: [],
    });
    const recalculated = calculateEstimateTotals(clone);
    setCurrentEstimate(recalculated);
    setSaveStatus('dirty');
    setOpenSections((prev) => ({ ...prev, [secIdx]: true }));
    showToast('Работа добавлена в раздел');
  };

  // Удаление работы с Undo snackbar
  const handleDeleteWork = (secIdx: number, itemIdx: number) => {
    if (!currentEstimate) return;
    const clone = JSON.parse(JSON.stringify(currentEstimate));
    const removedItem = clone.sections[secIdx].items[itemIdx];
    clone.sections[secIdx].items.splice(itemIdx, 1);
    const recalculated = calculateEstimateTotals(clone);
    setCurrentEstimate(recalculated);
    setSaveStatus('dirty');

    showToast(`Удалена работа: ${removedItem.name}`, () => {
      if (!currentEstimate) return;
      const restoreClone = JSON.parse(JSON.stringify(currentEstimate));
      restoreClone.sections[secIdx].items.splice(itemIdx, 0, removedItem);
      setCurrentEstimate(calculateEstimateTotals(restoreClone));
      setSaveStatus('dirty');
    });
  };

  // Добавление материала к работе
  const handleAddMaterial = (secIdx: number, itemIdx: number) => {
    if (!currentEstimate) return;
    const clone = JSON.parse(JSON.stringify(currentEstimate));
    if (!clone.sections[secIdx].items[itemIdx].materials) {
      clone.sections[secIdx].items[itemIdx].materials = [];
    }
    clone.sections[secIdx].items[itemIdx].materials.push({
      name: 'Новый сертифицированный материал / комплектующее',
      unit: 'шт.',
      quantity: 1,
      cost_price: 600,
      unit_price: 950,
    });
    const recalculated = calculateEstimateTotals(clone);
    setCurrentEstimate(recalculated);
    setSaveStatus('dirty');

    // Автоматически раскрываем материалы для этой работы
    const key = `${secIdx}_${itemIdx}`;
    setOpenMaterials((prev) => ({ ...prev, [key]: true }));
  };

  // Удаление материала
  const handleDeleteMaterial = (secIdx: number, itemIdx: number, matIdx: number) => {
    if (!currentEstimate) return;
    const clone = JSON.parse(JSON.stringify(currentEstimate));
    clone.sections[secIdx].items[itemIdx].materials.splice(matIdx, 1);
    const recalculated = calculateEstimateTotals(clone);
    setCurrentEstimate(recalculated);
    setSaveStatus('dirty');
  };

  // Добавление раздела
  const handleAddSection = () => {
    if (!currentEstimate) return;
    const clone = JSON.parse(JSON.stringify(currentEstimate));
    const newIdx = clone.sections.length;
    clone.sections.push({
      name: `РАЗДЕЛ ${newIdx + 1}. НОВЫЙ РАЗДЕЛ`,
      items: [],
    });
    setCurrentEstimate(clone);
    setSaveStatus('dirty');
    setOpenSections((prev) => ({ ...prev, [newIdx]: true }));
    showToast('Новый раздел добавлен');
  };

  // Удаление раздела с Undo
  const handleDeleteSection = (secIdx: number) => {
    if (!currentEstimate) return;
    const clone = JSON.parse(JSON.stringify(currentEstimate));
    const removedSec = clone.sections[secIdx];
    clone.sections.splice(secIdx, 1);
    const recalculated = calculateEstimateTotals(clone);
    setCurrentEstimate(recalculated);
    setConfirmDeleteSectionIdx(null);
    setSaveStatus('dirty');

    showToast(`Удален раздел "${removedSec.name}"`, () => {
      if (!currentEstimate) return;
      const restoreClone = JSON.parse(JSON.stringify(currentEstimate));
      restoreClone.sections.splice(secIdx, 0, removedSec);
      setCurrentEstimate(calculateEstimateTotals(restoreClone));
      setSaveStatus('dirty');
    });
  };

  // --- Экспорт документов (DOCX, PDF, XLSX) ---
  const handleExportDocx = async (est: AdminEstimate) => {
    showToast('Формирование Word (.docx)...');
    try {
      if (window.VgsDocExport?.downloadEstimateDocx) {
        await window.VgsDocExport.downloadEstimateDocx(est);
        showToast('Документ Word успешно сформирован и скачан!');
        return;
      }
      // Fallback через HTML/Blob
      const { estimate } = formatAdminEstimateToResult(est);
      const filename = `${est.number || 'КП-ВГС'}_Волгастрой76.docx`;
      const docxHtml = `
        <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
        <head><meta charset='utf-8'><title>${estimate.title}</title></head>
        <body style="font-family: Arial, sans-serif;">
          <h2>${estimate.title}</h2>
          <p>${estimate.subtitle}</p>
          <table border="1" cellpadding="6" cellspacing="0" style="border-collapse:collapse;width:100%;">
            <tr style="background:#0f172a;color:#fff;">
              <th>№</th><th>Наименование</th><th>Объем</th><th>Ед.</th><th>Цена</th><th>Сумма</th>
            </tr>
            ${estimate.rows
              .map(
                (r, i) => `
              <tr style="${r.kind === 'h' ? 'background:#e2e8f0;font-weight:bold;' : ''}">
                <td>${i + 1}</td>
                <td>${r.name}</td>
                <td>${r.volume || ''}</td>
                <td>${r.unit || ''}</td>
                <td>${r.unitPrice ? r.unitPrice + ' ₽' : ''}</td>
                <td>${r.cost ? r.cost + ' ₽' : ''}</td>
              </tr>
            `
              )
              .join('')}
          </table>
          <h3>Итого: ${estimate.totalCost.toLocaleString('ru-RU')} ₽</h3>
        </body></html>
      `;
      const blob = new Blob(['\ufeff', docxHtml], { type: 'application/msword' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      showToast('Документ Word успешно сформирован!');
    } catch (err) {
      console.error(err);
      showToast('Ошибка формирования DOCX');
    }
  };

  const handleExportPdf = async (est: AdminEstimate) => {
    showToast('Формирование PDF...');
    try {
      if (window.VgsDocExport?.downloadEstimatePdf) {
        await window.VgsDocExport.downloadEstimatePdf(est);
        showToast('Документ PDF успешно сформирован!');
        return;
      }
      const { estimate, config } = formatAdminEstimateToResult(est);
      await downloadCommercialProposalPdf(estimate, config);
      showToast('Документ PDF успешно сформирован!');
    } catch (err) {
      console.error(err);
      showToast('Ошибка формирования PDF');
    }
  };

  const handleExportXlsx = async (est: AdminEstimate) => {
    showToast('Формирование таблицы Excel (.xlsx)...');
    try {
      if (window.VgsDocExport?.downloadEstimateXlsx) {
        await window.VgsDocExport.downloadEstimateXlsx(est);
        showToast('Таблица Excel успешно сформирована!');
        return;
      }
      const { estimate, config } = formatAdminEstimateToResult(est);
      exportEstimateExcel(estimate, config);
      showToast('Таблица Excel успешно сформирована!');
    } catch (err) {
      console.error(err);
      showToast('Ошибка формирования XLSX');
    }
  };

  // --- Заявки ---
  const handleLeadStatusChange = async (id: number | string, status: string) => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/admin.php?action=lead_status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ id, status }),
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        const statusName = status === 'viewed' ? '«в работе»' : status === 'archived' ? '«в архиве»' : '«новая»';
        showToast(`Заявка #${id} переведена в статус ${statusName}`);
        await loadAllData();
      } else {
        showToast(`Ошибка: ${data.err || 'Не удалось обновить статус'}`);
      }
    } catch {
      showToast('Ошибка сети при смене статуса заявки');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteLead = async (id: number | string) => {
    if (!confirm(`Удалить заявку #${id}?`)) return;
    setIsLoading(true);
    try {
      const res = await fetch('/api/admin.php?action=lead_delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ id }),
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        showToast(`Заявка #${id} удалена из БД.`, data.history_id ? () => handleUndo(data.history_id) : undefined);
        await loadAllData();
      } else {
        showToast(`Ошибка: ${data.err || 'Не удалось удалить заявку'}`);
      }
    } catch {
      showToast('Ошибка сети при удалении заявки');
    } finally {
      setIsLoading(false);
    }
  };

  // --- Отзывы ---
  const handleToggleReviewApprove = async (id: number | string, currentApproved: boolean) => {
    const nextApproved = !currentApproved;
    setIsLoading(true);
    try {
      const res = await fetch('/api/admin.php?action=review_approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ id, approved: nextApproved }),
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        showToast(nextApproved ? 'Отзыв опубликован на сайте!' : 'Отзыв снят с публикации.');
        await loadAllData();
      } else {
        showToast(`Ошибка: ${data.err || 'Не удалось обновить отзыв'}`);
      }
    } catch {
      showToast('Ошибка сети при обновлении отзыва');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteReview = async (id: number | string, author: string) => {
    if (!confirm(`Удалить отзыв от «${author}»?`)) return;
    setIsLoading(true);
    try {
      const res = await fetch('/api/admin.php?action=review_delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ id }),
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        showToast('Отзыв удален из базы данных.', data.history_id ? () => handleUndo(data.history_id) : undefined);
        await loadAllData();
      } else {
        showToast(`Ошибка: ${data.err || 'Не удалось удалить отзыв'}`);
      }
    } catch {
      showToast('Ошибка сети при удалении отзыва');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!revAuthor.trim() || !revText.trim()) {
      showToast('Заполните автора и текст отзыва!');
      return;
    }
    setIsLoading(true);
    try {
      const res = await fetch('/api/admin.php?action=review_add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({
          author_name: revAuthor.trim(),
          object_type: revObject.trim() || 'Строительство и монтаж',
          rating: revRating,
          review_text: revText.trim(),
          approved: revApproved,
        }),
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        setShowAddReviewModal(false);
        setRevAuthor('');
        setRevObject('');
        setRevText('');
        showToast('Отзыв успешно добавлен в базу данных!');
        await loadAllData();
      } else {
        showToast(`Ошибка: ${data.err || 'Не удалось сохранить отзыв'}`);
      }
    } catch {
      showToast('Ошибка сети при добавлении отзыва');
    } finally {
      setIsLoading(false);
    }
  };

  // --- Вспомогательные функции ---
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'draft':
        return { text: 'Черновик', cls: 'bg-slate-700/80 text-slate-300 border-slate-600' };
      case 'calculating':
        return { text: 'В расчёте', cls: 'bg-blue-900/60 text-blue-300 border-blue-700' };
      case 'sent':
        return { text: 'КП отправлено', cls: 'bg-amber-900/60 text-amber-300 border-amber-700' };
      case 'agreed':
        return { text: 'Согласование', cls: 'bg-purple-900/60 text-purple-300 border-purple-700' };
      case 'approved':
        return { text: 'Утверждено', cls: 'bg-emerald-900/60 text-emerald-300 font-bold border-emerald-600' };
      case 'rejected':
        return { text: 'Отказ', cls: 'bg-rose-900/60 text-rose-300 border-rose-700' };
      case 'archived':
        return { text: 'В архиве', cls: 'bg-slate-800 text-slate-500 border-slate-700' };
      default:
        return { text: status, cls: 'bg-slate-800 text-slate-300 border-slate-700' };
    }
  };

  // Фильтрация смет
  const filteredEstimates = useMemo(() => {
    return estimates.filter((est) => {
      if (statusFilter !== 'all' && est.status !== statusFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const numMatch = (est.number || '').toLowerCase().includes(q);
        const objMatch = (est.object_name || '').toLowerCase().includes(q);
        const custMatch = (est.customer_name || '').toLowerCase().includes(q);
        const phoneMatch = (est.customer_phone || '').toLowerCase().includes(q);
        const addrMatch = (est.object_address || '').toLowerCase().includes(q);
        return numMatch || objMatch || custMatch || phoneMatch || addrMatch;
      }
      return true;
    });
  }, [estimates, statusFilter, searchQuery]);

  // Фильтрация заявок
  const filteredLeads = useMemo(() => {
    return leads.filter((lead) => {
      if (leadStatusFilter === 'all') return true;
      return (lead.status || 'new') === leadStatusFilter;
    });
  }, [leads, leadStatusFilter]);

  if (!isOpen) return null;

  // Динамическая высота контейнера с учетом VisualViewport клавиатуры
  const containerStyle: React.CSSProperties = isMobile
    ? {
        height: viewportHeight ? `${viewportHeight}px` : '100dvh',
        width: '100vw',
        paddingTop: 'env(safe-area-inset-top)',
        paddingBottom: 'env(safe-area-inset-bottom)',
        paddingLeft: 'env(safe-area-inset-left)',
        paddingRight: 'env(safe-area-inset-right)',
      }
    : {};

  return (
    <div
      ref={modalContainerRef}
      className={`fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md transition-all ${
        isMobile ? 'p-0 w-screen h-[100dvh] overflow-hidden' : 'p-2 sm:p-4'
      }`}
      style={isMobile ? { height: viewportHeight ? `${viewportHeight}px` : '100dvh' } : undefined}
    >
      {/* Главное окно панели */}
      <div
        className={`relative bg-[#0c121e] border border-slate-700/80 shadow-2xl flex flex-col text-slate-200 font-sans overflow-hidden ${
          isMobile
            ? 'w-full h-full rounded-none border-0'
            : 'w-full max-w-7xl h-[92vh] rounded-2xl'
        }`}
        style={containerStyle}
      >
        {/* ========================================================
            1. ВЕРХНИЙ ХЕДЕР (КОМПАКТНЫЙ НА МОБИЛЬНОМ)
        ======================================================== */}
        <div className="flex items-center justify-between px-3 sm:px-6 py-2.5 sm:py-3.5 bg-[#080d16] border-b border-slate-800 shrink-0">
          {/* Левая часть хедера */}
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            {currentEstimate ? (
              <button
                type="button"
                onClick={() => setCurrentEstimate(null)}
                className="min-w-[44px] min-h-[44px] flex items-center justify-center -ml-1 text-slate-300 hover:text-white rounded-xl active:bg-slate-800 transition-colors"
                title="Назад к списку"
              >
                <ArrowLeft className="w-5 h-5 text-amber-400" />
              </button>
            ) : (
              <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 font-bold text-base sm:text-lg shadow-inner shrink-0">
                ⚙️
              </div>
            )}

            <div className="min-w-0 truncate">
              <div className="flex items-center gap-1.5 sm:gap-2">
                <h2 className="text-sm sm:text-base font-black tracking-wide text-white truncate">
                  ВОЛГАСТРОЙ<span className="text-amber-500"> 76</span>
                </h2>
                {!isMobile && (
                  <>
                    <span className="px-2 py-0.5 text-[10px] font-bold uppercase rounded bg-amber-500/20 text-amber-400 border border-amber-500/30">
                      Панель управления
                    </span>
                    <span className="px-2 py-0.5 text-[10px] rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1 font-mono">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      БД Синхронизация
                    </span>
                  </>
                )}
              </div>
              <p className="text-[10px] sm:text-xs text-slate-400 font-mono truncate">
                {currentEstimate
                  ? `Смета ${currentEstimate.number} · ${currentEstimate.area} м²`
                  : activeTab === 'estimates'
                  ? 'Сметы и Коммерческие предложения'
                  : activeTab === 'leads'
                  ? 'Заявки клиентов с сайта'
                  : activeTab === 'reviews'
                  ? 'Отзывы клиентов'
                  : 'Журнал операций (Audit Trail)'}
              </p>
            </div>
          </div>

          {/* Правая часть хедера */}
          <div className="flex items-center gap-1 sm:gap-3 shrink-0">
            {isAuthenticated && !isMobile && (
              <>
                <button
                  type="button"
                  onClick={() => setShowHistoryModal(true)}
                  className="px-2.5 py-1 text-xs text-amber-300 hover:text-amber-200 bg-amber-950/40 hover:bg-amber-900/60 border border-amber-700/60 rounded-lg transition-colors flex items-center gap-1.5 shadow-sm"
                  title="Журнал и отмена действий"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>История ({historyItems.length})</span>
                </button>
                <div className="hidden lg:flex items-center gap-2 text-xs text-slate-400 bg-slate-900/80 px-3 py-1.5 rounded-lg border border-slate-800">
                  <User className="w-3.5 h-3.5 text-amber-400" />
                  <span>
                    Инженер: <strong className="text-slate-200">Звонарёв А.Б. (admin)</strong>
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="px-2.5 py-1 text-xs text-rose-400 hover:text-rose-300 hover:bg-rose-950/40 border border-rose-900/50 rounded-lg transition-colors flex items-center gap-1.5"
                  title="Выйти из админки"
                >
                  <Lock className="w-3.5 h-3.5" />
                  <span>Выйти</span>
                </button>
              </>
            )}

            {/* Кнопка закрытия всей панели ✕ (ГАРАНТИРОВАННО >= 44x44 px зона нажатия) */}
            <button
              type="button"
              onClick={onClose}
              className="min-w-[44px] min-h-[44px] flex items-center justify-center text-slate-400 hover:text-white rounded-xl active:bg-slate-800 transition-colors"
              title="Закрыть панель (Esc)"
              aria-label="Закрыть панель управления"
            >
              <X className="w-5 h-5 sm:w-6 sm:h-6" />
            </button>
          </div>
        </div>

        {/* Плавающий Toast / Snackbar */}
        {toastMessage && (
          <div className="absolute top-14 sm:top-16 right-3 sm:right-6 z-50 max-w-[calc(100vw-24px)] bg-slate-900 border border-amber-500/60 text-slate-100 font-medium px-3.5 py-2 sm:px-4 sm:py-2.5 rounded-xl shadow-2xl flex items-center gap-2.5 text-xs animate-in slide-in-from-top-2">
            <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0" />
            <span className="truncate">{toastMessage}</span>
            {toastUndoAction && (
              <button
                type="button"
                onClick={() => {
                  toastUndoAction();
                  setToastUndoAction(null);
                  setToastMessage('');
                }}
                className="ml-1 px-2 py-0.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded transition-colors flex items-center gap-1 text-[11px] shrink-0"
              >
                <RotateCcw className="w-3 h-3" />
                Отменить
              </button>
            )}
          </div>
        )}

        {/* ========================================================
            2. ОСНОВНОЙ КОНТЕНТ (АВТОРИЗОВАН / ЛОГИН)
        ======================================================== */}
        {isAuthenticated ? (
          <>
            {/* Навигационные вкладки (только если не в редакторе сметы) */}
            {!currentEstimate && (
              <div className="flex items-center gap-1.5 px-3 sm:px-6 py-2 bg-[#090f1b] border-b border-slate-800/80 text-xs shrink-0 overflow-x-auto no-scrollbar">
                <button
                  type="button"
                  onClick={() => setActiveTab('estimates')}
                  className={`min-h-[44px] sm:min-h-0 flex items-center gap-1.5 sm:gap-2 px-3.5 py-2 rounded-xl font-bold transition-all shrink-0 ${
                    activeTab === 'estimates'
                      ? 'bg-amber-600 text-white shadow-md shadow-amber-600/20'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                  }`}
                >
                  <span>📐 Сметы и КП</span>
                  <span className="px-1.5 py-0.2 text-[11px] rounded-full bg-black/30 font-mono">
                    {estimates.length}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('leads')}
                  className={`min-h-[44px] sm:min-h-0 flex items-center gap-1.5 sm:gap-2 px-3.5 py-2 rounded-xl font-bold transition-all shrink-0 ${
                    activeTab === 'leads'
                      ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                  }`}
                >
                  <span>📥 Заявки</span>
                  <span className="px-1.5 py-0.2 text-[11px] rounded-full bg-black/30 font-mono">
                    {leads.filter((l) => (l.status || 'new') === 'new').length > 0 ? (
                      <span className="text-amber-300 font-bold">
                        {leads.filter((l) => (l.status || 'new') === 'new').length}
                      </span>
                    ) : (
                      leads.length
                    )}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('reviews')}
                  className={`min-h-[44px] sm:min-h-0 flex items-center gap-1.5 sm:gap-2 px-3.5 py-2 rounded-xl font-bold transition-all shrink-0 ${
                    activeTab === 'reviews'
                      ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                  }`}
                >
                  <span>⭐ Отзывы</span>
                  <span className="px-1.5 py-0.2 text-[11px] rounded-full bg-black/30 font-mono">
                    {reviews.filter((r) => !r.approved).length > 0 ? (
                      <span className="text-amber-300 font-bold">
                        +{reviews.filter((r) => !r.approved).length}
                      </span>
                    ) : (
                      reviews.length
                    )}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('history')}
                  className={`min-h-[44px] sm:min-h-0 flex items-center gap-1.5 sm:gap-2 px-3.5 py-2 rounded-xl font-bold transition-all shrink-0 ${
                    activeTab === 'history'
                      ? 'bg-purple-600 text-white shadow-md shadow-purple-600/20'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                  }`}
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>История</span>
                  <span className="px-1.5 py-0.2 text-[11px] rounded-full bg-black/30 font-mono">
                    {historyItems.length}
                  </span>
                </button>

                {isMobile && (
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="min-h-[44px] ml-auto flex items-center gap-1 px-3 py-2 text-rose-400 active:bg-rose-950/40 rounded-xl text-xs"
                    title="Выйти"
                  >
                    <Lock className="w-3.5 h-3.5" />
                    <span>Выход</span>
                  </button>
                )}
              </div>
            )}

            {/* ========================================================
                3. РАБОЧАЯ ОБЛАСТЬ (РЕДАКТОР СМЕТЫ ИЛИ СПИСКИ)
            ======================================================== */}
            <div className="flex-1 overflow-y-auto overflow-x-hidden bg-[#0a101d] p-3 sm:p-6 custom-scrollbar">
              {currentEstimate ? (
                /* -----------------------------------------------------
                   3.1 ПОЛНОЭКРАННЫЙ РЕДАКТОР СМЕТЫ (МОБИЛЬНЫЙ + DESKTOP)
                ------------------------------------------------------ */
                <div className="space-y-4 sm:space-y-6 pb-24 sm:pb-8">
                  {/* Статус сохранения и быстрые кнопки */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-800 text-xs">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setCurrentEstimate(null)}
                        className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-300 hover:text-white bg-slate-800/80 min-h-[44px] px-3.5 py-2 rounded-xl border border-slate-700 transition-colors"
                      >
                        <ArrowLeft className="w-4 h-4 text-amber-400" />
                        <span>К списку</span>
                      </button>

                      {saveStatus === 'dirty' && (
                        <span className="flex items-center gap-1 text-[11px] text-amber-400 font-medium px-2 py-1 rounded bg-amber-950/50 border border-amber-800/60">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                          Несохранённые правки
                        </span>
                      )}
                      {saveStatus === 'saved' && (
                        <span className="flex items-center gap-1 text-[11px] text-emerald-400 font-medium px-2 py-1 rounded bg-emerald-950/50 border border-emerald-800/60">
                          <Check className="w-3 h-3 text-emerald-400" />
                          Сохранено в MySQL
                        </span>
                      )}
                      {saveStatus === 'error' && (
                        <span className="flex items-center gap-1 text-[11px] text-rose-400 font-medium px-2 py-1 rounded bg-rose-950/50 border border-rose-800/60">
                          <AlertCircle className="w-3 h-3 text-rose-400" />
                          Ошибка сохранения!
                        </span>
                      )}
                    </div>

                    {/* Десктопные кнопки сохранения и документов в хедере */}
                    <div className="hidden sm:flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleSaveEstimate}
                        disabled={isLoading}
                        className="min-h-[40px] px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-lg shadow-emerald-600/20 transition-all"
                      >
                        <Check className="w-4 h-4" />
                        <span>{saveStatus === 'saving' ? 'Сохранение...' : 'Сохранить смету'}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleExportDocx(currentEstimate)}
                        className="min-h-[40px] px-3 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition-colors"
                      >
                        DOCX
                      </button>
                      <button
                        type="button"
                        onClick={() => handleExportPdf(currentEstimate)}
                        className="min-h-[40px] px-3 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-bold transition-colors"
                      >
                        PDF
                      </button>
                      <button
                        type="button"
                        onClick={() => handleExportXlsx(currentEstimate)}
                        className="min-h-[40px] px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-bold transition-colors"
                      >
                        XLSX
                      </button>
                    </div>
                  </div>

                  {/* Сетка: Шаг 1 (Реквизиты) + Состав сметы + Итоги */}
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
                    <div className="lg:col-span-2 space-y-4 sm:space-y-6 min-w-0">
                      {/* ШАГ 1: Реквизиты сметы */}
                      <div className="bg-[#0f172a]/95 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-lg space-y-3.5">
                        <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                          <div className="flex items-center gap-2 text-sm font-black text-white">
                            <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-mono">
                              1
                            </span>
                            <span>Параметры объекта и Заказчика</span>
                          </div>
                          <span className="text-xs text-amber-400 font-mono font-bold">
                            {currentEstimate.area} м²
                          </span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-xs">
                          <div>
                            <label className="block text-slate-400 mb-1 font-bold">Номер КП</label>
                            <input
                              type="text"
                              value={currentEstimate.number}
                              onFocus={handleInputFocus}
                              onChange={(e) => {
                                setCurrentEstimate({ ...currentEstimate, number: e.target.value });
                                setSaveStatus('dirty');
                              }}
                              className="w-full min-h-[44px] bg-slate-900 border border-slate-750 rounded-xl px-3 py-2 text-white font-mono text-sm focus:border-amber-500 focus:outline-none"
                            />
                          </div>

                          <div>
                            <label className="block text-slate-400 mb-1 font-bold">Статус</label>
                            <select
                              value={currentEstimate.status}
                              onFocus={handleInputFocus}
                              onChange={(e) => {
                                setCurrentEstimate({ ...currentEstimate, status: e.target.value });
                                setSaveStatus('dirty');
                              }}
                              className="w-full min-h-[44px] bg-slate-900 border border-slate-750 rounded-xl px-3 py-2 text-white text-sm focus:border-amber-500 focus:outline-none"
                            >
                              <option value="draft">Черновик</option>
                              <option value="calculating">В расчёте</option>
                              <option value="sent">КП отправлено</option>
                              <option value="agreed">Согласование</option>
                              <option value="approved">Утверждено</option>
                              <option value="rejected">Отказ</option>
                              <option value="archived">Архив</option>
                            </select>
                          </div>

                          <div>
                            <label className="block text-slate-400 mb-1 font-bold">
                              Площадь объекта (м²)
                            </label>
                            <input
                              type="number"
                              step="0.1"
                              value={currentEstimate.area}
                              onFocus={handleInputFocus}
                              onChange={(e) => handleAreaChange(e.target.value)}
                              className="w-full min-h-[44px] bg-slate-900 border border-amber-500/60 rounded-xl px-3 py-2 text-amber-400 font-bold font-mono text-base focus:border-amber-400 focus:outline-none"
                            />
                          </div>

                          <div className="sm:col-span-2">
                            <label className="block text-slate-400 mb-1 font-bold">Название объекта</label>
                            <input
                              type="text"
                              value={currentEstimate.object_name}
                              onFocus={handleInputFocus}
                              onChange={(e) => {
                                setCurrentEstimate({ ...currentEstimate, object_name: e.target.value });
                                setSaveStatus('dirty');
                              }}
                              className="w-full min-h-[44px] bg-slate-900 border border-slate-750 rounded-xl px-3 py-2 text-white text-sm focus:border-amber-500 focus:outline-none"
                              placeholder="Например: Дом из сэндвич-панелей 80 м²"
                            />
                          </div>

                          <div>
                            <label className="block text-slate-400 mb-1 font-bold">ФИО Заказчика</label>
                            <input
                              type="text"
                              value={currentEstimate.customer_name}
                              onFocus={handleInputFocus}
                              onChange={(e) => {
                                setCurrentEstimate({ ...currentEstimate, customer_name: e.target.value });
                                setSaveStatus('dirty');
                              }}
                              className="w-full min-h-[44px] bg-slate-900 border border-slate-750 rounded-xl px-3 py-2 text-white text-sm focus:border-amber-500 focus:outline-none"
                              placeholder="Иванов Иван"
                            />
                          </div>

                          <div>
                            <label className="block text-slate-400 mb-1 font-bold">Телефон Заказчика</label>
                            <input
                              type="tel"
                              value={currentEstimate.customer_phone}
                              onFocus={handleInputFocus}
                              onChange={(e) => {
                                setCurrentEstimate({ ...currentEstimate, customer_phone: e.target.value });
                                setSaveStatus('dirty');
                              }}
                              className="w-full min-h-[44px] bg-slate-900 border border-slate-750 rounded-xl px-3 py-2 text-white font-mono text-sm focus:border-amber-500 focus:outline-none"
                              placeholder="+7 (___) ___-__-__"
                            />
                          </div>

                          <div>
                            <label className="block text-slate-400 mb-1 font-bold">Адрес объекта</label>
                            <input
                              type="text"
                              value={currentEstimate.object_address}
                              onFocus={handleInputFocus}
                              onChange={(e) => {
                                setCurrentEstimate({ ...currentEstimate, object_address: e.target.value });
                                setSaveStatus('dirty');
                              }}
                              className="w-full min-h-[44px] bg-slate-900 border border-slate-750 rounded-xl px-3 py-2 text-white text-sm focus:border-amber-500 focus:outline-none"
                              placeholder="г. Рыбинск / Ярославль"
                            />
                          </div>

                          <div>
                            <label className="block text-slate-400 mb-1 font-bold">Срок выполнения</label>
                            <input
                              type="text"
                              value={currentEstimate.lead_time || ''}
                              onFocus={handleInputFocus}
                              onChange={(e) => {
                                setCurrentEstimate({ ...currentEstimate, lead_time: e.target.value });
                                setSaveStatus('dirty');
                              }}
                              className="w-full min-h-[44px] bg-slate-900 border border-slate-750 rounded-xl px-3 py-2 text-white text-sm focus:border-amber-500 focus:outline-none"
                              placeholder="14-21 день"
                            />
                          </div>
                        </div>
                      </div>

                      {/* ШАГ 2: Состав сметы (Разделы и Работы) */}
                      <div className="space-y-3.5">
                        <div className="flex items-center justify-between">
                          <h3 className="text-sm font-black text-white flex items-center gap-2">
                            <span>📋 Разделы и позиции сметы</span>
                            <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 font-mono">
                              {currentEstimate.sections.length}
                            </span>
                          </h3>
                          <button
                            type="button"
                            onClick={handleAddSection}
                            className="min-h-[44px] sm:min-h-0 inline-flex items-center gap-1.5 text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white px-3.5 py-2 rounded-xl transition-colors shadow-sm"
                          >
                            <Plus className="w-4 h-4" />
                            <span>Добавить раздел</span>
                          </button>
                        </div>

                        {/* Список разделов */}
                        {currentEstimate.sections.map((sec, secIdx) => {
                          const isSectionOpen = openSections[secIdx] !== false;
                          const totalSecCost = sec.items.reduce(
                            (acc, it) => acc + (it.total_cost || 0) + (it.materials || []).reduce((ma, m) => ma + (m.total_cost || 0), 0),
                            0
                          );

                          return (
                            <div
                              key={secIdx}
                              className="bg-[#0f172a] border border-slate-800 rounded-2xl overflow-hidden shadow-lg transition-all"
                            >
                              {/* Заголовок раздела (Аккордеон) */}
                              <div className="flex flex-wrap items-center justify-between gap-2 px-3 sm:px-4 py-2.5 sm:py-3 bg-slate-900 border-b border-slate-800">
                                <div className="flex items-center gap-2 flex-1 min-w-[200px]">
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setOpenSections((prev) => ({
                                        ...prev,
                                        [secIdx]: !isSectionOpen,
                                      }))
                                    }
                                    className="min-w-[44px] min-h-[44px] flex items-center justify-center text-slate-400 hover:text-white rounded-lg -ml-2"
                                    title={isSectionOpen ? 'Свернуть раздел' : 'Развернуть раздел'}
                                  >
                                    {isSectionOpen ? (
                                      <ChevronDown className="w-5 h-5 text-amber-400" />
                                    ) : (
                                      <ChevronRight className="w-5 h-5 text-slate-400" />
                                    )}
                                  </button>

                                  <input
                                    type="text"
                                    value={sec.name}
                                    onFocus={handleInputFocus}
                                    onChange={(e) => {
                                      const clone = JSON.parse(JSON.stringify(currentEstimate));
                                      clone.sections[secIdx].name = e.target.value;
                                      setCurrentEstimate(clone);
                                      setSaveStatus('dirty');
                                    }}
                                    className="text-xs sm:text-sm font-black text-amber-400 bg-transparent border-b border-dashed border-slate-700 focus:border-amber-400 focus:outline-none flex-1 py-1"
                                  />
                                </div>

                                <div className="flex items-center gap-2 shrink-0">
                                  <span className="text-xs font-mono font-bold text-slate-300 hidden sm:inline">
                                    {totalSecCost.toLocaleString('ru-RU')} ₽
                                  </span>

                                  <button
                                    type="button"
                                    onClick={() => handleAddWork(secIdx)}
                                    className="min-h-[44px] sm:min-h-0 text-xs font-bold text-blue-400 hover:text-blue-300 bg-blue-950/70 border border-blue-800/80 px-3 py-2 rounded-xl transition-colors flex items-center gap-1"
                                  >
                                    <Plus className="w-3.5 h-3.5" />
                                    <span>Работа</span>
                                  </button>

                                  {confirmDeleteSectionIdx === secIdx ? (
                                    <div className="flex items-center gap-1 bg-rose-950 border border-rose-800 px-2 py-1 rounded-xl">
                                      <span className="text-[10px] text-rose-300 font-bold">Удалить?</span>
                                      <button
                                        type="button"
                                        onClick={() => handleDeleteSection(secIdx)}
                                        className="text-[10px] font-bold bg-rose-600 hover:bg-rose-500 text-white px-2 py-1 rounded"
                                      >
                                        Да
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => setConfirmDeleteSectionIdx(null)}
                                        className="text-[10px] text-slate-300 hover:text-white px-1.5 py-1"
                                      >
                                        Отмена
                                      </button>
                                    </div>
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={() => setConfirmDeleteSectionIdx(secIdx)}
                                      className="min-w-[44px] min-h-[44px] sm:min-w-0 sm:min-h-0 flex items-center justify-center text-slate-400 hover:text-rose-400 active:bg-rose-950/40 p-1.5 rounded-xl transition-colors"
                                      title="Удалить раздел"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  )}
                                </div>
                              </div>

                              {/* Тело раздела (Развернуто/Свернуто) */}
                              {isSectionOpen && (
                                <div className="p-2 sm:p-3 space-y-2">
                                  {sec.items.length === 0 ? (
                                    <div className="text-center py-6 text-slate-500 text-xs">
                                      В этом разделе пока нет работ. Нажмите «+ Работа», чтобы добавить первую позицию.
                                    </div>
                                  ) : isMobile ? (
                                    /* -------------------------------------------------
                                       МОБИЛЬНЫЙ ВИД: КАРТОЧКИ ПОЗИЦИЙ (НЕ ТАБЛИЦА!)
                                    -------------------------------------------------- */
                                    sec.items.map((item, itemIdx) => {
                                      const itemCost = (item.quantity || 0) * (item.unit_price || 0);
                                      const isLocked = item.is_qty_locked === 1;
                                      const matKey = `${secIdx}_${itemIdx}`;
                                      const isMatsOpen = openMaterials[matKey] ?? false;
                                      const matCount = item.materials?.length || 0;

                                      return (
                                        <div
                                          key={itemIdx}
                                          className="p-3 bg-slate-900/90 border border-slate-850 rounded-xl space-y-2.5"
                                        >
                                          {/* Верхняя строка карточки: Код + Название (ПОЛНЫЙ ПЕРЕНОС СТРОК) */}
                                          <div className="flex items-start justify-between gap-2">
                                            <div className="flex items-start gap-2 flex-1 min-w-0">
                                              <span className="text-[10px] font-mono font-bold text-blue-400 bg-blue-950 px-1.5 py-0.5 rounded shrink-0 mt-0.5">
                                                W{itemIdx + 1}
                                              </span>
                                              <textarea
                                                rows={2}
                                                value={item.name}
                                                onFocus={handleInputFocus}
                                                onChange={(e) =>
                                                  handleWorkFieldChange(secIdx, itemIdx, 'name', e.target.value)
                                                }
                                                className="w-full bg-transparent text-white font-medium text-xs leading-snug border-0 focus:outline-none focus:bg-slate-800/80 rounded px-1 py-0.5 resize-none"
                                                style={{
                                                  whiteSpace: 'normal',
                                                  overflowWrap: 'anywhere',
                                                }}
                                              />
                                            </div>

                                            {/* Кнопка быстрого удаления работы */}
                                            <button
                                              type="button"
                                              onClick={() => handleDeleteWork(secIdx, itemIdx)}
                                              className="min-w-[44px] min-h-[44px] flex items-center justify-center text-slate-500 hover:text-rose-400 active:bg-rose-950/40 rounded-lg -mr-1 -mt-1 shrink-0"
                                              title="Удалить работу"
                                            >
                                              <Trash2 className="w-4 h-4" />
                                            </button>
                                          </div>

                                          {/* Числовые поля карточки для ввода пальцем (>= 44px высота) */}
                                          <div className="grid grid-cols-2 gap-2 text-xs">
                                            {/* Количество и единицы */}
                                            <div className="p-2 bg-slate-950/80 border border-slate-800 rounded-xl">
                                              <div className="text-[10px] text-slate-400 flex items-center justify-between mb-1">
                                                <span>Количество ({item.unit || 'шт.'})</span>
                                                <button
                                                  type="button"
                                                  onClick={() => handleToggleLockQty(secIdx, itemIdx)}
                                                  className={`p-1 rounded ${
                                                    isLocked ? 'text-amber-400' : 'text-slate-500'
                                                  }`}
                                                  title={
                                                    isLocked
                                                      ? 'Объем зафиксирован 🔒'
                                                      : 'Объем привязан к площади 🔓'
                                                  }
                                                >
                                                  {isLocked ? (
                                                    <Lock className="w-3.5 h-3.5" />
                                                  ) : (
                                                    <Unlock className="w-3.5 h-3.5" />
                                                  )}
                                                </button>
                                              </div>
                                              <input
                                                type="number"
                                                step="0.01"
                                                value={item.quantity}
                                                onFocus={handleInputFocus}
                                                onChange={(e) =>
                                                  handleWorkFieldChange(
                                                    secIdx,
                                                    itemIdx,
                                                    'quantity',
                                                    parseFloat(e.target.value) || 0
                                                  )
                                                }
                                                className="w-full min-h-[40px] bg-slate-900 border border-slate-750 rounded-lg px-2 text-right font-mono text-sm text-white focus:border-amber-500 focus:outline-none"
                                              />
                                            </div>

                                            {/* Цена клиенту */}
                                            <div className="p-2 bg-slate-950/80 border border-slate-800 rounded-xl">
                                              <div className="text-[10px] text-slate-400 flex items-center justify-between mb-1">
                                                <span>Цена клиенту (₽)</span>
                                                <span className="text-[10px] font-mono text-slate-500">
                                                  Себест: {item.cost_price}
                                                </span>
                                              </div>
                                              <input
                                                type="number"
                                                value={item.unit_price}
                                                onFocus={handleInputFocus}
                                                onChange={(e) =>
                                                  handleWorkFieldChange(
                                                    secIdx,
                                                    itemIdx,
                                                    'unit_price',
                                                    parseFloat(e.target.value) || 0
                                                  )
                                                }
                                                className="w-full min-h-[40px] bg-slate-900 border border-slate-750 rounded-lg px-2 text-right font-mono text-sm text-amber-400 font-bold focus:border-amber-400 focus:outline-none"
                                              />
                                            </div>
                                          </div>

                                          {/* Нижняя плашка карточки: Итого по работе + Кнопки материалов */}
                                          <div className="flex items-center justify-between pt-1 border-t border-slate-800/60 text-xs">
                                            <div className="flex items-center gap-2">
                                              {matCount > 0 && (
                                                <button
                                                  type="button"
                                                  onClick={() =>
                                                    setOpenMaterials((prev) => ({
                                                      ...prev,
                                                      [matKey]: !isMatsOpen,
                                                    }))
                                                  }
                                                  className="min-h-[38px] px-2.5 py-1 text-[11px] font-bold text-amber-300 bg-amber-950/60 border border-amber-800/80 rounded-lg flex items-center gap-1 active:bg-amber-900"
                                                >
                                                  <Package className="w-3.5 h-3.5 text-amber-400" />
                                                  <span>Материалы ({matCount})</span>
                                                  {isMatsOpen ? (
                                                    <ChevronUp className="w-3 h-3 ml-0.5" />
                                                  ) : (
                                                    <ChevronDown className="w-3 h-3 ml-0.5" />
                                                  )}
                                                </button>
                                              )}

                                              <button
                                                type="button"
                                                onClick={() => handleAddMaterial(secIdx, itemIdx)}
                                                className="min-h-[38px] px-2.5 py-1 text-[11px] text-blue-400 bg-blue-950/50 border border-blue-800/60 rounded-lg flex items-center gap-1"
                                                title="Добавить материал к работе"
                                              >
                                                <Plus className="w-3 h-3" />
                                                <span>Мат</span>
                                              </button>
                                            </div>

                                            <div className="text-right">
                                              <span className="text-[10px] text-slate-500 block">Сумма:</span>
                                              <span className="font-mono font-black text-white text-sm">
                                                {Math.round(itemCost).toLocaleString('ru-RU')} ₽
                                              </span>
                                            </div>
                                          </div>

                                          {/* Вложенные материалы (Раскрываемый блок) */}
                                          {isMatsOpen && matCount > 0 && (
                                            <div className="pt-2 pl-2 border-l-2 border-amber-500/40 space-y-2 mt-2">
                                              <div className="text-[11px] font-bold text-amber-400 flex items-center gap-1">
                                                <Package className="w-3.5 h-3.5" />
                                                <span>Материалы к позиции W{itemIdx + 1}:</span>
                                              </div>

                                              {item.materials?.map((mat, matIdx) => {
                                                const mTotal = (mat.quantity || 0) * (mat.unit_price || 0);
                                                return (
                                                  <div
                                                    key={matIdx}
                                                    className="p-2 bg-black/40 border border-slate-800/80 rounded-lg text-xs space-y-1.5"
                                                  >
                                                    <div className="flex items-start justify-between gap-2">
                                                      <textarea
                                                        rows={2}
                                                        value={mat.name}
                                                        onFocus={handleInputFocus}
                                                        onChange={(e) =>
                                                          handleMaterialFieldChange(
                                                            secIdx,
                                                            itemIdx,
                                                            matIdx,
                                                            'name',
                                                            e.target.value
                                                          )
                                                        }
                                                        className="w-full bg-transparent text-slate-300 text-xs border-0 focus:outline-none focus:bg-slate-850 rounded px-1 resize-none"
                                                        style={{
                                                          whiteSpace: 'normal',
                                                          overflowWrap: 'anywhere',
                                                        }}
                                                      />
                                                      <button
                                                        type="button"
                                                        onClick={() =>
                                                          handleDeleteMaterial(secIdx, itemIdx, matIdx)
                                                        }
                                                        className="min-w-[36px] min-h-[36px] flex items-center justify-center text-slate-600 hover:text-rose-400 shrink-0"
                                                        title="Удалить материал"
                                                      >
                                                        <X className="w-3.5 h-3.5" />
                                                      </button>
                                                    </div>

                                                    <div className="grid grid-cols-3 gap-1.5 text-[11px] font-mono">
                                                      <div>
                                                        <span className="text-[9px] text-slate-500 block">
                                                          Кол-во ({mat.unit})
                                                        </span>
                                                        <input
                                                          type="number"
                                                          step="0.01"
                                                          value={mat.quantity}
                                                          onFocus={handleInputFocus}
                                                          onChange={(e) =>
                                                            handleMaterialFieldChange(
                                                              secIdx,
                                                              itemIdx,
                                                              matIdx,
                                                              'quantity',
                                                              parseFloat(e.target.value) || 0
                                                            )
                                                          }
                                                          className="w-full min-h-[34px] bg-slate-950 border border-slate-800 rounded px-1.5 text-right text-slate-200"
                                                        />
                                                      </div>
                                                      <div>
                                                        <span className="text-[9px] text-slate-500 block">
                                                          Цена ₽
                                                        </span>
                                                        <input
                                                          type="number"
                                                          value={mat.unit_price}
                                                          onFocus={handleInputFocus}
                                                          onChange={(e) =>
                                                            handleMaterialFieldChange(
                                                              secIdx,
                                                              itemIdx,
                                                              matIdx,
                                                              'unit_price',
                                                              parseFloat(e.target.value) || 0
                                                            )
                                                          }
                                                          className="w-full min-h-[34px] bg-slate-950 border border-slate-800 rounded px-1.5 text-right text-amber-300"
                                                        />
                                                      </div>
                                                      <div className="text-right flex flex-col justify-end">
                                                        <span className="text-[9px] text-slate-500">Итого:</span>
                                                        <span className="font-bold text-white text-xs">
                                                          {Math.round(mTotal).toLocaleString('ru-RU')} ₽
                                                        </span>
                                                      </div>
                                                    </div>
                                                  </div>
                                                );
                                              })}
                                            </div>
                                          )}
                                        </div>
                                      );
                                    })
                                  ) : (
                                    /* -------------------------------------------------
                                       DESKTOP ВИД: ПРИВЫЧНАЯ ТАБЛИЦА С КОЛОНКАМИ
                                    -------------------------------------------------- */
                                    <div className="overflow-x-auto">
                                      <table className="w-full text-left text-xs border-collapse font-mono">
                                        <thead>
                                          <tr className="bg-slate-950/60 text-slate-400 border-b border-slate-800/80 text-[11px]">
                                            <th className="py-2.5 px-3 w-5/12">Позиция (Работа / Комплектующие)</th>
                                            <th className="py-2.5 px-2 w-2/12">Кол-во</th>
                                            <th className="py-2.5 px-2 w-1/12">Ед.</th>
                                            <th className="py-2.5 px-2 w-2/12 text-right">Клиенту (₽)</th>
                                            <th className="py-2.5 px-2 w-2/12 text-right">Сумма (₽)</th>
                                            <th className="py-2.5 px-2 w-1/12 text-center" />
                                          </tr>
                                        </thead>
                                        <tbody>
                                          {sec.items.map((item, itemIdx) => {
                                            const itemCost = (item.quantity || 1) * (item.unit_price || 0);
                                            const isLocked = item.is_qty_locked === 1;

                                            return (
                                              <React.Fragment key={itemIdx}>
                                                <tr className="border-b border-slate-800/60 hover:bg-slate-900/40 bg-slate-900/20 font-sans">
                                                  <td className="py-2.5 px-3">
                                                    <div className="flex items-center gap-2">
                                                      <span className="text-[10px] font-mono font-bold text-blue-400 bg-blue-950/80 px-1 py-0.5 rounded">
                                                        W{itemIdx + 1}
                                                      </span>
                                                      <input
                                                        type="text"
                                                        value={item.name}
                                                        onChange={(e) =>
                                                          handleWorkFieldChange(secIdx, itemIdx, 'name', e.target.value)
                                                        }
                                                        className="w-full bg-transparent border-0 text-white font-medium focus:outline-none focus:bg-slate-800/60 px-1 py-0.5 rounded text-xs"
                                                      />
                                                    </div>
                                                  </td>
                                                  <td className="py-2 px-2">
                                                    <div className="flex items-center gap-1">
                                                      <input
                                                        type="number"
                                                        step="0.01"
                                                        value={item.quantity}
                                                        onChange={(e) =>
                                                          handleWorkFieldChange(
                                                            secIdx,
                                                            itemIdx,
                                                            'quantity',
                                                            parseFloat(e.target.value) || 0
                                                          )
                                                        }
                                                        className="w-16 bg-slate-950 border border-slate-800 rounded px-1.5 py-1 text-right text-xs font-mono text-white"
                                                      />
                                                      <button
                                                        type="button"
                                                        onClick={() => handleToggleLockQty(secIdx, itemIdx)}
                                                        className={`p-1 rounded text-xs ${
                                                          isLocked
                                                            ? 'text-amber-400 bg-amber-950/50'
                                                            : 'text-slate-500 hover:text-slate-300'
                                                        }`}
                                                        title={
                                                          isLocked
                                                            ? 'Объем зафиксирован 🔒'
                                                            : 'Объем рассчитывается по площади 🔓'
                                                        }
                                                      >
                                                        {isLocked ? (
                                                          <Lock className="w-3 h-3" />
                                                        ) : (
                                                          <Unlock className="w-3 h-3" />
                                                        )}
                                                      </button>
                                                    </div>
                                                  </td>
                                                  <td className="py-2 px-2">
                                                    <input
                                                      type="text"
                                                      value={item.unit}
                                                      onChange={(e) =>
                                                        handleWorkFieldChange(secIdx, itemIdx, 'unit', e.target.value)
                                                      }
                                                      className="w-12 bg-transparent text-slate-400 text-xs text-center border-0"
                                                    />
                                                  </td>
                                                  <td className="py-2 px-2 text-right">
                                                    <input
                                                      type="number"
                                                      value={item.unit_price}
                                                      onChange={(e) =>
                                                        handleWorkFieldChange(
                                                          secIdx,
                                                          itemIdx,
                                                          'unit_price',
                                                          parseFloat(e.target.value) || 0
                                                        )
                                                      }
                                                      className="w-20 bg-slate-950 border border-slate-800 rounded px-1.5 py-1 text-right text-xs font-mono text-white"
                                                    />
                                                  </td>
                                                  <td className="py-2 px-2 text-right font-mono font-bold text-white">
                                                    {Math.round(itemCost).toLocaleString('ru-RU')} ₽
                                                  </td>
                                                  <td className="py-2 px-2 text-center">
                                                    <div className="flex items-center justify-center gap-1">
                                                      <button
                                                        type="button"
                                                        onClick={() => handleAddMaterial(secIdx, itemIdx)}
                                                        className="text-[10px] text-amber-400 hover:text-amber-300 bg-amber-950/60 px-1.5 py-0.5 rounded font-bold"
                                                        title="Добавить материал к работе"
                                                      >
                                                        +Мат
                                                      </button>
                                                      <button
                                                        type="button"
                                                        onClick={() => handleDeleteWork(secIdx, itemIdx)}
                                                        className="text-slate-500 hover:text-rose-400 p-0.5"
                                                        title="Удалить работу"
                                                      >
                                                        <Trash2 className="w-3.5 h-3.5" />
                                                      </button>
                                                    </div>
                                                  </td>
                                                </tr>

                                                {/* Вложенные материалы под работой в десктопном режиме */}
                                                {(item.materials || []).map((mat, matIdx) => {
                                                  const matCost = (mat.quantity || 1) * (mat.unit_price || 0);
                                                  return (
                                                    <tr
                                                      key={matIdx}
                                                      className="border-b border-slate-900/60 bg-black/30 font-sans text-[11px] text-slate-300"
                                                    >
                                                      <td className="py-1.5 pl-8 pr-2">
                                                        <div className="flex items-center gap-1.5">
                                                          <span className="text-slate-600 font-mono">↳</span>
                                                          <input
                                                            type="text"
                                                            value={mat.name}
                                                            onChange={(e) =>
                                                              handleMaterialFieldChange(
                                                                secIdx,
                                                                itemIdx,
                                                                matIdx,
                                                                'name',
                                                                e.target.value
                                                             )
                                                            }
                                                            className="w-full bg-transparent border-0 text-slate-300 focus:outline-none focus:bg-slate-800/60 px-1 rounded text-[11px]"
                                                          />
                                                        </div>
                                                      </td>
                                                      <td className="py-1.5 px-2">
                                                        <input
                                                          type="number"
                                                          step="0.01"
                                                          value={mat.quantity}
                                                          onChange={(e) =>
                                                            handleMaterialFieldChange(
                                                              secIdx,
                                                              itemIdx,
                                                              matIdx,
                                                              'quantity',
                                                              parseFloat(e.target.value) || 0
                                                            )
                                                          }
                                                          className="w-16 bg-slate-950 border border-slate-800/60 rounded px-1.5 py-0.5 text-right font-mono text-[11px] text-slate-300"
                                                        />
                                                      </td>
                                                      <td className="py-1.5 px-2 text-center text-slate-500 font-mono text-[10px]">
                                                        {mat.unit}
                                                      </td>
                                                      <td className="py-1.5 px-2 text-right">
                                                        <input
                                                          type="number"
                                                          value={mat.unit_price}
                                                          onChange={(e) =>
                                                            handleMaterialFieldChange(
                                                              secIdx,
                                                              itemIdx,
                                                              matIdx,
                                                              'unit_price',
                                                              parseFloat(e.target.value) || 0
                                                            )
                                                          }
                                                          className="w-20 bg-slate-950 border border-slate-800/60 rounded px-1.5 py-0.5 text-right font-mono text-[11px] text-slate-300"
                                                        />
                                                      </td>
                                                      <td className="py-1.5 px-2 text-right font-mono text-slate-400">
                                                        {Math.round(matCost).toLocaleString('ru-RU')} ₽
                                                      </td>
                                                      <td className="py-1.5 px-2 text-center">
                                                        <button
                                                          type="button"
                                                          onClick={() => handleDeleteMaterial(secIdx, itemIdx, matIdx)}
                                                          className="text-slate-600 hover:text-rose-400"
                                                          title="Удалить материал"
                                                        >
                                                          <X className="w-3 h-3" />
                                                        </button>
                                                      </td>
                                                    </tr>
                                                  );
                                                })}
                                              </React.Fragment>
                                            );
                                          })}
                                        </tbody>
                                      </table>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* ПРАВАЯ КОЛОНКА (ДЕСКТОП) / ПЛАВАЮЩИЙ БЛОК ИТОГОВ */}
                    <div className="hidden lg:block space-y-4">
                      <div className="sticky top-2 bg-[#0f172a] border-2 border-amber-500/40 rounded-2xl p-5 shadow-2xl space-y-4">
                        <div className="text-base font-black text-white border-b border-slate-800 pb-3 flex items-center justify-between">
                          <span>Итоги сметы</span>
                          <span className="text-xs px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800 font-mono">
                            {currentEstimate.area} м²
                          </span>
                        </div>

                        <div className="space-y-2 text-xs">
                          <div className="flex justify-between text-slate-400">
                            <span>Монтаж и сборка:</span>
                            <strong className="text-white font-mono">
                              {currentEstimate.work_total.toLocaleString('ru-RU')} ₽
                            </strong>
                          </div>
                          <div className="flex justify-between text-slate-400">
                            <span>Материалы и комплектующие:</span>
                            <strong className="text-white font-mono">
                              {currentEstimate.material_total.toLocaleString('ru-RU')} ₽
                            </strong>
                          </div>
                          <div className="flex justify-between text-slate-400">
                            <span>Логистика и доставка:</span>
                            <strong className="text-white font-mono">
                              {currentEstimate.delivery_total.toLocaleString('ru-RU')} ₽
                            </strong>
                          </div>
                        </div>

                        <div className="border-t-2 border-slate-800 pt-3 flex justify-between items-baseline">
                          <span className="text-xs uppercase font-bold text-slate-300">Итого клиенту:</span>
                          <span className="text-xl font-black text-amber-400 font-mono">
                            {currentEstimate.grand_total.toLocaleString('ru-RU')} ₽
                          </span>
                        </div>

                        <div className="p-3 bg-emerald-950/40 border border-emerald-800/60 rounded-xl text-xs space-y-1.5">
                          <div className="font-bold text-emerald-400 flex items-center gap-1.5">
                            <TrendingUp className="w-3.5 h-3.5" />
                            <span>Показатели маржинальности:</span>
                          </div>
                          <div className="flex justify-between text-[11px] text-slate-400">
                            <span>Себестоимость:</span>
                            <span className="font-mono text-slate-300">
                              {(
                                currentEstimate.work_cost_price + currentEstimate.material_cost_price
                              ).toLocaleString('ru-RU')}{' '}
                              ₽
                            </span>
                          </div>
                          <div className="flex justify-between text-[11px] text-emerald-300 font-bold">
                            <span>Ожидаемая маржа:</span>
                            <span className="font-mono">
                              {currentEstimate.expected_margin.toLocaleString('ru-RU')} ₽ (
                              {currentEstimate.grand_total > 0
                                ? Math.round(
                                    (currentEstimate.expected_margin / currentEstimate.grand_total) * 100
                                  )
                                : 0}
                              %)
                            </span>
                          </div>
                        </div>

                        <div className="pt-2 space-y-2">
                          <button
                            type="button"
                            onClick={handleSaveEstimate}
                            disabled={isLoading}
                            className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs transition-colors flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20"
                          >
                            <Check className="w-4 h-4" />
                            <span>
                              {saveStatus === 'saving' ? 'Сохранение в MySQL...' : 'Сохранить смету'}
                            </span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleExportDocx(currentEstimate)}
                            className="w-full py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-xs transition-colors flex items-center justify-center gap-2"
                          >
                            <FileText className="w-4 h-4" />
                            <span>Сформировать КП (Word .docx)</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleExportPdf(currentEstimate)}
                            className="w-full py-2 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-xl text-xs transition-colors flex items-center justify-center gap-2"
                          >
                            <Download className="w-4 h-4" />
                            <span>Сформировать КП (PDF)</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleExportXlsx(currentEstimate)}
                            className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-xl text-xs transition-colors flex items-center justify-center gap-2 border border-slate-700"
                          >
                            <Layers className="w-4 h-4" />
                            <span>Сформировать смету (.xlsx)</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* ========================================================
                      STICKY SAVE BAR НА МОБИЛЬНОМ (ПУНКТ 21 ТЗ)
                      Располагается над клавиатурой, учитывает VisualViewport и safe-area
                  ======================================================== */}
                  {isMobile && (
                    <div
                      className="fixed left-0 right-0 z-40 bg-[#090f1b]/98 backdrop-blur-md border-t border-slate-750 p-2.5 transition-all shadow-2xl"
                      style={{
                        bottom: isKeyboardOpen ? `${keyboardHeight}px` : '0px',
                        paddingBottom: isKeyboardOpen ? '8px' : 'calc(env(safe-area-inset-bottom) + 8px)',
                      }}
                    >
                      <div className="flex items-center justify-between gap-2 max-w-lg mx-auto">
                        <button
                          type="button"
                          onClick={() => setMobileTotalsDrawerOpen(!mobileTotalsDrawerOpen)}
                          className="flex-1 text-left bg-slate-900/90 border border-slate-750 rounded-xl px-3 py-1.5 flex items-center justify-between min-h-[44px]"
                        >
                          <div>
                            <span className="text-[10px] text-slate-400 block">Итого клиенту:</span>
                            <span className="font-mono font-black text-amber-400 text-base">
                              {currentEstimate.grand_total.toLocaleString('ru-RU')} ₽
                            </span>
                          </div>
                          <div className="flex items-center text-slate-400">
                            {mobileTotalsDrawerOpen ? (
                              <ChevronDown className="w-4 h-4" />
                            ) : (
                              <ChevronUp className="w-4 h-4" />
                            )}
                          </div>
                        </button>

                        <button
                          type="button"
                          onClick={handleSaveEstimate}
                          disabled={isLoading}
                          className="min-h-[44px] px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 active:scale-95 text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-lg shadow-emerald-600/25 flex items-center justify-center gap-1.5 shrink-0"
                        >
                          <Check className="w-4 h-4" />
                          <span>{saveStatus === 'saving' ? '...' : 'Сохранить'}</span>
                        </button>
                      </div>

                      {/* Раскрывающийся ящик с детальными итогами и документами */}
                      {mobileTotalsDrawerOpen && (
                        <div className="mt-2 pt-2 border-t border-slate-850 space-y-2 text-xs animate-in slide-in-from-bottom-2">
                          <div className="grid grid-cols-3 gap-1 text-[11px] font-mono text-center">
                            <div className="bg-slate-950/80 p-1.5 rounded-lg border border-slate-800">
                              <span className="text-slate-500 block text-[9px]">Монтаж:</span>
                              <span className="text-white font-bold">
                                {Math.round(currentEstimate.work_total / 1000)}k ₽
                              </span>
                            </div>
                            <div className="bg-slate-950/80 p-1.5 rounded-lg border border-slate-800">
                              <span className="text-slate-500 block text-[9px]">Материалы:</span>
                              <span className="text-white font-bold">
                                {Math.round(currentEstimate.material_total / 1000)}k ₽
                              </span>
                            </div>
                            <div className="bg-slate-950/80 p-1.5 rounded-lg border border-slate-800">
                              <span className="text-slate-500 block text-[9px]">Маржа:</span>
                              <span className="text-emerald-400 font-bold">
                                {currentEstimate.grand_total > 0
                                  ? Math.round(
                                      (currentEstimate.expected_margin / currentEstimate.grand_total) * 100
                                    )
                                  : 0}
                                %
                              </span>
                            </div>
                          </div>

                          <div className="grid grid-cols-3 gap-1.5 pt-1">
                            <button
                              type="button"
                              onClick={() => handleExportDocx(currentEstimate)}
                              className="min-h-[44px] py-2 bg-blue-600 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1"
                            >
                              <FileText className="w-3.5 h-3.5" />
                              <span>DOCX</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleExportPdf(currentEstimate)}
                              className="min-h-[44px] py-2 bg-amber-600 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1"
                            >
                              <Download className="w-3.5 h-3.5" />
                              <span>PDF</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleExportXlsx(currentEstimate)}
                              className="min-h-[44px] py-2 bg-slate-800 text-slate-200 border border-slate-700 rounded-xl text-xs font-bold flex items-center justify-center gap-1"
                            >
                              <Layers className="w-3.5 h-3.5" />
                              <span>XLSX</span>
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                /* -----------------------------------------------------
                   3.2 РАБОЧИЕ СПИСКИ (СМЕТЫ, ЗАЯВКИ, ОТЗЫВЫ, ИСТОРИЯ)
                ------------------------------------------------------ */
                <div className="space-y-4">
                  {/* --- ВКЛАДКА: СМЕТЫ И КП --- */}
                  {activeTab === 'estimates' && (
                    <div className="space-y-3.5 pb-20 sm:pb-0">
                      {/* Поиск и быстрые фильтры (на мобильном на всю ширину) */}
                      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 p-3 bg-slate-900/90 border border-slate-800 rounded-2xl">
                        <div className="flex items-center gap-2 flex-1">
                          <div className="relative flex-1">
                            <Search className="w-4 h-4 absolute left-3 top-3.5 sm:top-2.5 text-slate-500 pointer-events-none" />
                            <input
                              type="search"
                              placeholder="Поиск по номеру, объекту, клиенту…"
                              value={searchQuery}
                              onFocus={handleInputFocus}
                              onChange={(e) => setSearchQuery(e.target.value)}
                              className="w-full min-h-[44px] sm:min-h-0 bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-8 py-2 text-xs sm:text-xs text-white placeholder-slate-500 focus:border-amber-500 focus:outline-none"
                            />
                            {searchQuery && (
                              <button
                                type="button"
                                onClick={() => setSearchQuery('')}
                                className="absolute right-2.5 top-3 text-slate-500 hover:text-white"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            )}
                          </div>

                          {/* Кнопка фильтра (на мобильном открывает Bottom Sheet) */}
                          {isMobile ? (
                            <button
                              type="button"
                              onClick={() => setShowFilterSheet(true)}
                              className={`min-h-[44px] min-w-[44px] px-3 flex items-center justify-center gap-1.5 rounded-xl border text-xs font-bold shrink-0 transition-colors ${
                                statusFilter !== 'all'
                                  ? 'bg-amber-600 text-white border-amber-500'
                                  : 'bg-slate-800 text-slate-300 border-slate-700'
                              }`}
                            >
                              <Filter className="w-4 h-4" />
                              {statusFilter !== 'all' && (
                                <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
                              )}
                            </button>
                          ) : (
                            <select
                              value={statusFilter}
                              onChange={(e) => setStatusFilter(e.target.value)}
                              className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 focus:border-amber-500 focus:outline-none"
                            >
                              <option value="all">Все статусы ({estimates.length})</option>
                              <option value="draft">Черновик</option>
                              <option value="calculating">В расчёте</option>
                              <option value="sent">КП отправлено</option>
                              <option value="agreed">Согласование</option>
                              <option value="approved">Утверждено</option>
                              <option value="rejected">Отказ</option>
                              <option value="archived">В архиве</option>
                            </select>
                          )}

                          <button
                            type="button"
                            onClick={loadAllData}
                            disabled={isLoading}
                            className="min-h-[44px] sm:min-h-0 min-w-[44px] px-3 py-2 bg-slate-800 hover:bg-slate-700 active:bg-slate-900 text-slate-300 rounded-xl border border-slate-700 transition-colors flex items-center justify-center gap-1 font-mono text-xs shrink-0"
                            title="Обновить из БД"
                          >
                            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-amber-400' : ''}`} />
                            <span className="hidden sm:inline">Обновить</span>
                          </button>
                        </div>

                        {/* Кнопка создания новой сметы */}
                        <button
                          type="button"
                          onClick={() => setShowTemplateModal(true)}
                          className="min-h-[48px] sm:min-h-[40px] inline-flex items-center justify-center gap-2 bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 active:scale-98 text-slate-950 font-black text-xs uppercase tracking-wider px-4 py-2.5 rounded-xl shadow-lg shadow-amber-600/25 transition-all shrink-0"
                        >
                          <Plus className="w-4 h-4 stroke-[3]" />
                          <span>Создать смету / Выбрать комплекс</span>
                        </button>
                      </div>

                      {/* ----------------------------------------------------
                          МОБИЛЬНЫЙ РЕЖИМ СПИСКА: КАРТОЧКИ (ПУНКТ 8 ТЗ)
                      ----------------------------------------------------- */}
                      {isMobile ? (
                        <div className="space-y-3">
                          {filteredEstimates.map((est) => {
                            const badge = getStatusBadge(est.status);
                            const marginPercent =
                              est.grand_total > 0
                                ? Math.round((est.expected_margin / est.grand_total) * 100)
                                : 0;

                            return (
                              <div
                                key={est.id}
                                className="p-4 bg-[#0f172a] hover:bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-2xl space-y-3 shadow-md transition-all active:scale-[0.99]"
                              >
                                {/* Строка 1: Номер + Статус */}
                                <div className="flex items-center justify-between gap-2">
                                  <span className="font-mono font-black text-blue-400 text-sm">
                                    {est.number}
                                  </span>
                                  <span
                                    className={`px-2 py-0.5 text-[11px] rounded-lg border font-medium ${badge.cls}`}
                                  >
                                    {badge.text}
                                  </span>
                                </div>

                                {/* Строка 2: Объект и Заказчик */}
                                <div>
                                  <h4 className="font-bold text-white text-sm leading-snug">
                                    {est.object_name || 'Строительный объект'}
                                  </h4>
                                  <div className="text-xs text-slate-400 flex items-center gap-1.5 mt-0.5">
                                    <MapPin className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                                    <span className="truncate">{est.object_address || 'Ярославская обл.'}</span>
                                    {est.area > 0 && (
                                      <>
                                        <span>·</span>
                                        <span className="text-amber-400 font-mono font-bold">
                                          {est.area} м²
                                        </span>
                                      </>
                                    )}
                                  </div>
                                </div>

                                {/* Строка 3: Заказчик */}
                                <div className="text-xs text-slate-300 flex items-center justify-between pt-1 border-t border-slate-800/60">
                                  <div className="flex items-center gap-1.5 truncate">
                                    <User className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                                    <span className="truncate">{est.customer_name || 'Заказчик'}</span>
                                  </div>
                                  {est.customer_phone && (
                                    <a
                                      href={`tel:${est.customer_phone}`}
                                      className="text-xs font-mono text-amber-400 flex items-center gap-1 shrink-0 ml-2"
                                    >
                                      <Phone className="w-3 h-3" />
                                      <span>{est.customer_phone}</span>
                                    </a>
                                  )}
                                </div>

                                {/* Строка 4: Финансовые итоги */}
                                <div className="p-2.5 bg-slate-950/80 border border-slate-800 rounded-xl flex items-center justify-between">
                                  <div>
                                    <span className="text-[10px] text-slate-500 block">Итого клиенту:</span>
                                    <span className="font-mono font-black text-amber-400 text-base">
                                      {est.grand_total.toLocaleString('ru-RU')} ₽
                                    </span>
                                  </div>
                                  <div className="text-right">
                                    <span className="text-[10px] text-slate-500 block">Маржа инженера:</span>
                                    <span className="font-mono font-bold text-emerald-400 text-xs">
                                      +{est.expected_margin.toLocaleString('ru-RU')} ₽ ({marginPercent}%)
                                    </span>
                                  </div>
                                </div>

                                {/* Строка 5: Действия (Зона нажатия >= 44x44px) */}
                                <div className="flex items-center gap-1.5 pt-1">
                                  <button
                                    type="button"
                                    onClick={() => setCurrentEstimate(est)}
                                    className="flex-1 min-h-[44px] bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-colors shadow-sm"
                                  >
                                    <Edit3 className="w-4 h-4" />
                                    <span>Открыть смету</span>
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => handleExportDocx(est)}
                                    className="min-h-[44px] min-w-[44px] px-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-bold flex items-center justify-center"
                                    title="Скачать DOCX"
                                  >
                                    DOCX
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => handleExportPdf(est)}
                                    className="min-h-[44px] min-w-[44px] px-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-bold flex items-center justify-center"
                                    title="Скачать PDF"
                                  >
                                    PDF
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => handleExportXlsx(est)}
                                    className="min-h-[44px] min-w-[44px] px-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-bold flex items-center justify-center"
                                    title="Скачать XLSX"
                                  >
                                    XLSX
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => handleDuplicateEstimate(est)}
                                    className="min-h-[44px] min-w-[44px] flex items-center justify-center text-slate-400 hover:text-white bg-slate-850 active:bg-slate-800 rounded-xl"
                                    title="Копировать"
                                  >
                                    <Copy className="w-4 h-4" />
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => handleDeleteEstimate(est.id)}
                                    className="min-h-[44px] min-w-[44px] flex items-center justify-center text-slate-500 hover:text-rose-400 bg-slate-850 active:bg-rose-950/40 rounded-xl"
                                    title="Удалить"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              </div>
                            );
                          })}

                          {filteredEstimates.length === 0 && (
                            <div className="py-12 text-center text-slate-400 bg-[#0f172a] border border-slate-800 rounded-2xl p-6">
                              <FileText className="w-10 h-10 mx-auto mb-3 text-slate-600" />
                              <div className="text-sm font-semibold text-slate-200">
                                Сметы не найдены
                              </div>
                              <div className="text-xs text-slate-500 mt-1">
                                Измените поисковый запрос или нажмите «+ Создать смету»
                              </div>
                            </div>
                          )}
                        </div>
                      ) : (
                        /* ----------------------------------------------------
                           ДЕСКТОПНЫЙ РЕЖИМ: ШИРОКАЯ ТАБЛИЦА СМЕТ
                        ----------------------------------------------------- */
                        <div className="bg-[#0f172a] border border-slate-800 rounded-2xl overflow-x-auto shadow-xl">
                          <table className="w-full text-left text-xs border-collapse">
                            <thead>
                              <tr className="bg-slate-950 text-slate-400 border-b border-slate-800 text-[11px] uppercase tracking-wider font-mono">
                                <th className="py-3 px-4">Номер / Статус</th>
                                <th className="py-3 px-4">Объект / Адрес</th>
                                <th className="py-3 px-4">Площадь</th>
                                <th className="py-3 px-4">Заказчик</th>
                                <th className="py-3 px-4 text-right">Итог клиенту</th>
                                <th className="py-3 px-4 text-right">Маржа инженера</th>
                                <th className="py-3 px-4">Действия</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800/80">
                              {filteredEstimates.map((est) => {
                                const badge = getStatusBadge(est.status);
                                return (
                                  <tr key={est.id} className="hover:bg-slate-900/60 transition-colors">
                                    <td className="py-3 px-4">
                                      <div className="font-mono font-bold text-blue-400 text-sm">
                                        {est.number}
                                      </div>
                                      <span
                                        className={`inline-block mt-1 px-2 py-0.5 text-[10px] rounded border ${badge.cls}`}
                                      >
                                        {badge.text}
                                      </span>
                                    </td>
                                    <td className="py-3 px-4">
                                      <div className="font-bold text-white text-sm">{est.object_name}</div>
                                      <div className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                                        <MapPin className="w-3 h-3 text-slate-500" />
                                        <span>{est.object_address}</span>
                                      </div>
                                    </td>
                                    <td className="py-3 px-4 font-mono font-bold text-slate-200">
                                      {est.area > 0 ? `${est.area} м²` : '—'}
                                    </td>
                                    <td className="py-3 px-4">
                                      <div className="font-medium text-slate-200">{est.customer_name}</div>
                                      <div className="text-[11px] text-slate-400 font-mono">
                                        {est.customer_phone}
                                      </div>
                                    </td>
                                    <td className="py-3 px-4 text-right">
                                      <div className="font-black text-amber-400 font-mono text-sm">
                                        {est.grand_total.toLocaleString('ru-RU')} ₽
                                      </div>
                                      <div className="text-[10px] text-slate-500 font-mono">
                                        Раб: {Math.round(est.work_total / 1000)}k | Мат:{' '}
                                        {Math.round(est.material_total / 1000)}k
                                      </div>
                                    </td>
                                    <td className="py-3 px-4 text-right">
                                      <div className="font-bold text-emerald-400 font-mono">
                                        +{est.expected_margin.toLocaleString('ru-RU')} ₽
                                      </div>
                                      <div className="text-[10px] text-emerald-500 font-mono">
                                        {est.grand_total > 0
                                          ? Math.round((est.expected_margin / est.grand_total) * 100)
                                          : 0}
                                        %
                                      </div>
                                    </td>
                                    <td className="py-3 px-4">
                                      <div className="flex items-center gap-1.5">
                                        <button
                                          type="button"
                                          onClick={() => setCurrentEstimate(est)}
                                          className="bg-blue-600 hover:bg-blue-500 text-white px-2.5 py-1 rounded text-xs font-bold transition-colors"
                                          title="Редактировать смету"
                                        >
                                          Открыть
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => handleExportDocx(est)}
                                          className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 px-2 py-1 rounded text-xs"
                                          title="Скачать DOCX"
                                        >
                                          DOCX
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => handleExportPdf(est)}
                                          className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 px-2 py-1 rounded text-xs"
                                          title="Скачать PDF"
                                        >
                                          PDF
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => handleExportXlsx(est)}
                                          className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 px-2 py-1 rounded text-xs"
                                          title="Скачать XLSX"
                                        >
                                          XLSX
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => handleDuplicateEstimate(est)}
                                          className="text-slate-400 hover:text-slate-200 p-1"
                                          title="Копировать"
                                        >
                                          <Copy className="w-3.5 h-3.5" />
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => handleDeleteEstimate(est.id)}
                                          className="text-slate-500 hover:text-rose-400 p-1"
                                          title="Удалить смету"
                                        >
                                          <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                      </div>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  )}

                  {/* --- ВКЛАДКА: ЗАЯВКИ С САЙТА --- */}
                  {activeTab === 'leads' && (
                    <div className="space-y-3.5">
                      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 p-3 bg-slate-900 border border-slate-800 rounded-2xl text-xs">
                        <div className="flex items-center gap-3">
                          <span className="text-slate-300 font-bold">
                            Входящие заявки с сайта ({leads.length})
                          </span>
                          <button
                            type="button"
                            onClick={loadAllData}
                            disabled={isLoading}
                            className="min-h-[44px] sm:min-h-0 px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg border border-slate-700 transition-colors flex items-center gap-1 font-mono text-[11px]"
                          >
                            <RefreshCw className="w-3.5 h-3.5" />
                            <span>Обновить</span>
                          </button>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="text-slate-400 font-mono">Статус:</span>
                          <select
                            value={leadStatusFilter}
                            onChange={(e) => setLeadStatusFilter(e.target.value)}
                            className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-300 focus:border-amber-500 focus:outline-none"
                          >
                            <option value="all">Все ({leads.length})</option>
                            <option value="new">
                              Новые ({leads.filter((l) => (l.status || 'new') === 'new').length})
                            </option>
                            <option value="viewed">
                              В работе ({leads.filter((l) => l.status === 'viewed').length})
                            </option>
                            <option value="archived">
                              Архив ({leads.filter((l) => l.status === 'archived').length})
                            </option>
                          </select>
                        </div>
                      </div>

                      {/* Список карточек заявок */}
                      <div className="grid grid-cols-1 gap-3">
                        {filteredLeads.map((lead) => {
                          const curStatus = lead.status || 'new';
                          return (
                            <div
                              key={lead.id}
                              className="p-4 bg-[#0f172a] border border-slate-800 rounded-2xl space-y-2.5"
                            >
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <div className="flex items-center gap-2.5">
                                  <span className="text-xs font-mono font-bold text-blue-400">
                                    #{lead.id}
                                  </span>
                                  <span className="font-bold text-white text-sm">{lead.name}</span>
                                  <a
                                    href={`tel:${lead.phone}`}
                                    className="text-xs text-amber-400 font-mono hover:underline flex items-center gap-1 min-h-[44px] sm:min-h-0"
                                  >
                                    <Phone className="w-3.5 h-3.5" />
                                    <span>{lead.phone}</span>
                                  </a>
                                </div>

                                <div className="flex items-center gap-2">
                                  <span
                                    className={`px-2 py-0.5 text-[10px] font-bold rounded-lg border ${
                                      curStatus === 'new'
                                        ? 'bg-amber-950 text-amber-300 border-amber-800 animate-pulse'
                                        : curStatus === 'viewed'
                                        ? 'bg-blue-950 text-blue-300 border-blue-800'
                                        : 'bg-slate-800 text-slate-400 border-slate-700'
                                    }`}
                                  >
                                    {curStatus === 'new'
                                      ? 'Новая'
                                      : curStatus === 'viewed'
                                      ? 'В работе'
                                      : 'В архиве'}
                                  </span>
                                  <span className="text-[11px] text-slate-500 font-mono">
                                    {lead.created_at}
                                  </span>
                                </div>
                              </div>

                              {lead.topic && (
                                <div className="text-xs text-slate-300 font-semibold">
                                  Тема: <span className="text-white">{lead.topic}</span>
                                </div>
                              )}

                              {lead.message && (
                                <div className="p-2.5 bg-slate-950/60 rounded-xl text-xs text-slate-300 border border-slate-800/80">
                                  {lead.message}
                                </div>
                              )}

                              {lead.calc && (
                                <div className="text-xs text-slate-400 font-mono bg-blue-950/30 p-2.5 rounded-xl border border-blue-900/40">
                                  Расчет клиента:{' '}
                                  <strong className="text-blue-300">{lead.calc}</strong>
                                </div>
                              )}

                              <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-800/60">
                                <div className="flex items-center gap-2">
                                  {curStatus !== 'viewed' && (
                                    <button
                                      type="button"
                                      onClick={() => handleLeadStatusChange(lead.id, 'viewed')}
                                      className="min-h-[44px] sm:min-h-0 px-3 py-1.5 bg-blue-600/30 hover:bg-blue-600/50 text-blue-300 border border-blue-500/40 text-xs rounded-xl transition-colors"
                                    >
                                      Взять в работу
                                    </button>
                                  )}
                                  {curStatus !== 'archived' && (
                                    <button
                                      type="button"
                                      onClick={() => handleLeadStatusChange(lead.id, 'archived')}
                                      className="min-h-[44px] sm:min-h-0 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs rounded-xl transition-colors"
                                    >
                                      В архив
                                    </button>
                                  )}
                                  {curStatus === 'archived' && (
                                    <button
                                      type="button"
                                      onClick={() => handleLeadStatusChange(lead.id, 'new')}
                                      className="min-h-[44px] sm:min-h-0 px-3 py-1.5 bg-amber-600/30 hover:bg-amber-600/50 text-amber-300 border border-amber-500/40 text-xs rounded-xl transition-colors"
                                    >
                                      Вернуть в новые
                                    </button>
                                  )}
                                </div>

                                <button
                                  type="button"
                                  onClick={() => handleDeleteLead(lead.id)}
                                  className="min-h-[44px] sm:min-h-0 text-slate-500 hover:text-rose-400 p-2 rounded-xl transition-colors flex items-center gap-1 text-xs"
                                  title="Удалить заявку"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                  <span>Удалить</span>
                                </button>
                              </div>
                            </div>
                          );
                        })}

                        {filteredLeads.length === 0 && (
                          <div className="p-12 text-center bg-slate-900/50 border border-slate-800 rounded-2xl text-slate-400">
                            <Send className="w-8 h-8 mx-auto mb-2 text-slate-600" />
                            <div className="text-sm font-semibold text-slate-300">
                              Заявок нет
                            </div>
                            <div className="text-xs text-slate-500 mt-1">
                              Новые обращения с сайта появятся здесь автоматически
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* --- ВКЛАДКА: ОТЗЫВЫ --- */}
                  {activeTab === 'reviews' && (
                    <div className="space-y-3.5">
                      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 p-3 bg-slate-900 border border-slate-800 rounded-2xl text-xs">
                        <div className="flex items-center gap-3">
                          <span className="text-slate-300 font-bold">
                            Отзывы заказчиков ({reviews.length})
                          </span>
                          <button
                            type="button"
                            onClick={loadAllData}
                            disabled={isLoading}
                            className="min-h-[44px] sm:min-h-0 px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg border border-slate-700 transition-colors flex items-center gap-1 font-mono text-[11px]"
                          >
                            <RefreshCw className="w-3.5 h-3.5" />
                            <span>Обновить</span>
                          </button>
                        </div>

                        <button
                          type="button"
                          onClick={() => setShowAddReviewModal(true)}
                          className="min-h-[44px] sm:min-h-0 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white rounded-xl font-bold flex items-center justify-center gap-1.5 transition-all text-xs"
                        >
                          <Plus className="w-4 h-4" />
                          <span>Добавить отзыв</span>
                        </button>
                      </div>

                      {/* Список карточек отзывов */}
                      <div className="grid grid-cols-1 gap-3">
                        {reviews.map((rev) => (
                          <div
                            key={rev.id}
                            className="p-4 bg-[#0f172a] border border-slate-800 rounded-2xl space-y-2.5"
                          >
                            <div className="flex items-center justify-between">
                              <div>
                                <span className="font-bold text-white text-sm">{rev.author_name}</span>
                                {rev.object_type && (
                                  <div className="text-xs text-slate-400">{rev.object_type}</div>
                                )}
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-amber-400 font-mono font-bold">
                                  {'★'.repeat(rev.rating)}
                                </span>
                                <span
                                  className={`px-2 py-0.5 text-[10px] rounded-lg font-bold border ${
                                    rev.approved
                                      ? 'bg-emerald-950 text-emerald-300 border-emerald-800'
                                      : 'bg-amber-950 text-amber-300 border-amber-800'
                                  }`}
                                >
                                  {rev.approved ? 'Одобрен' : 'На модерации'}
                                </span>
                              </div>
                            </div>

                            <p className="text-xs text-slate-300 italic bg-slate-950/60 p-3 rounded-xl border border-slate-800">
                              "{rev.review_text}"
                            </p>

                            <div className="flex items-center justify-between pt-1 border-t border-slate-800/60">
                              <span className="text-[11px] text-slate-500 font-mono">
                                {rev.created_at || ''}
                              </span>
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => handleToggleReviewApprove(rev.id, rev.approved)}
                                  className={`min-h-[44px] sm:min-h-0 px-3 py-1.5 text-xs font-bold rounded-xl transition-colors ${
                                    rev.approved
                                      ? 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700'
                                      : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                                  }`}
                                >
                                  {rev.approved ? 'Снять с сайта' : 'Одобрить'}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteReview(rev.id, rev.author_name)}
                                  className="min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0 flex items-center justify-center text-slate-500 hover:text-rose-400 p-1.5 rounded-xl transition-colors"
                                  title="Удалить отзыв"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}

                        {reviews.length === 0 && (
                          <div className="p-12 text-center bg-slate-900/50 border border-slate-800 rounded-2xl text-slate-400">
                            <Star className="w-8 h-8 mx-auto mb-2 text-slate-600" />
                            <div className="text-sm font-semibold text-slate-300">
                              Отзывов пока нет
                            </div>
                            <div className="text-xs text-slate-500 mt-1">
                              Вы можете добавить первый отзыв с помощью кнопки выше
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* --- ВКЛАДКА: ЖУРНАЛ ДЕЙСТВИЙ И UNDO --- */}
                  {activeTab === 'history' && (
                    <div className="space-y-3.5">
                      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 p-3 bg-slate-900 border border-slate-800 rounded-2xl text-xs">
                        <div className="flex items-center gap-2">
                          <RotateCcw className="w-4 h-4 text-purple-400" />
                          <span className="text-slate-300 font-bold">
                            Журнал изменений и отмена действий (Audit Trail & Undo)
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-slate-400 font-mono text-[11px]">
                            Записей: {historyItems.length}
                          </span>
                          <button
                            type="button"
                            onClick={loadAllData}
                            className="min-h-[44px] sm:min-h-0 px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg border border-slate-700 transition-colors flex items-center gap-1 font-mono text-[11px]"
                          >
                            <RefreshCw className="w-3.5 h-3.5" />
                            <span>Обновить</span>
                          </button>
                        </div>
                      </div>

                      {/* Карточки истории на мобильном */}
                      <div className="grid grid-cols-1 gap-2.5">
                        {historyItems.map((item) => {
                          const isUndone = !!item.undone_at;
                          return (
                            <div
                              key={item.id}
                              className="p-3 sm:p-4 bg-[#0f172a] border border-slate-800 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-2.5"
                            >
                              <div className="flex items-start gap-2.5">
                                <span className="text-[10px] font-mono text-slate-500 shrink-0 mt-0.5">
                                  {item.time || item.created_at}
                                </span>
                                <div>
                                  <div className="text-xs font-semibold text-slate-200">
                                    {item.title}
                                  </div>
                                  <div className="text-[10px] text-slate-400 flex items-center gap-2 mt-0.5">
                                    <span className="capitalize px-1.5 py-0.2 rounded bg-slate-800 border border-slate-750 text-slate-300">
                                      {item.type === 'estimate'
                                        ? '📄 Смета'
                                        : item.type === 'lead'
                                        ? '📋 Заявка'
                                        : item.type === 'review'
                                        ? '⭐ Отзыв'
                                        : '📁 Раздел'}
                                    </span>
                                    <span>
                                      Действие: {item.action === 'delete' ? 'Удаление' : item.action}
                                    </span>
                                  </div>
                                </div>
                              </div>

                              <div className="flex items-center justify-end">
                                {isUndone ? (
                                  <span className="text-[11px] text-slate-500 font-mono bg-slate-900 px-2.5 py-1 rounded-lg border border-slate-800">
                                    ↩ Отменено ({item.undone_at})
                                  </span>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => handleUndo(item)}
                                    className="min-h-[44px] sm:min-h-0 px-3.5 py-2 bg-purple-600/30 hover:bg-purple-600/50 active:bg-purple-600/70 text-purple-300 border border-purple-500/40 font-bold text-xs rounded-xl transition-colors inline-flex items-center gap-1.5"
                                  >
                                    <RotateCcw className="w-3.5 h-3.5" />
                                    <span>Восстановить</span>
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })}

                        {historyItems.length === 0 && (
                          <div className="p-12 text-center bg-slate-900/50 border border-slate-800 rounded-2xl text-slate-400">
                            <Clock className="w-8 h-8 mx-auto mb-2 text-slate-600" />
                            <div className="text-sm font-semibold text-slate-300">
                              Журнал действий пуст
                            </div>
                            <div className="text-xs text-slate-500 mt-1">
                              Все операции изменения и удаления объектов будут фиксироваться здесь
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </>
        ) : (
          /* ========================================================
              4. ЭКРАН ВХОДА (LOGIN) — ПУНКТ 19 ТЗ
              Полностью оптимизирован под клавиатуру и ввод на телефоне
          ======================================================== */
          <div className="flex-1 flex items-center justify-center p-4 sm:p-6 bg-[#0a101d] overflow-y-auto">
            <div className="w-full max-w-sm sm:max-w-md bg-[#0f172a] border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl relative my-auto">
              <div className="text-center mb-6">
                <div className="w-14 h-14 mx-auto rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 mb-3 shadow-inner">
                  <Shield className="w-7 h-7" />
                </div>
                <h3 className="text-lg font-black text-white">Вход в систему управления</h3>
                <p className="text-xs text-slate-400 mt-1">
                  Доступ для инженерного состава СК «Волгастрой 76»
                </p>
              </div>

              {loginError && (
                <div className="mb-4 p-3 rounded-xl bg-rose-950/80 border border-rose-800 text-rose-300 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                  <span>{loginError}</span>
                </div>
              )}

              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                    Логин инженера
                  </label>
                  <input
                    type="text"
                    value={loginUser}
                    autoComplete="username"
                    required
                    onFocus={handleInputFocus}
                    onChange={(e) => setLoginUser(e.target.value)}
                    placeholder="Например: admin"
                    className="w-full min-h-[48px] bg-slate-900 border border-slate-750 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                    Пароль доступа
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={loginPass}
                      autoComplete="current-password"
                      required
                      onFocus={handleInputFocus}
                      onChange={(e) => setLoginPass(e.target.value)}
                      placeholder="Введите пароль"
                      className="w-full min-h-[48px] bg-slate-900 border border-slate-750 rounded-xl pl-4 pr-12 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 transition-colors"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-2 top-2 min-w-[44px] min-h-[44px] flex items-center justify-center text-slate-400 hover:text-white"
                      tabIndex={-1}
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full min-h-[50px] bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 active:scale-[0.99] text-slate-950 font-black text-xs uppercase tracking-wider rounded-xl shadow-lg shadow-amber-600/25 transition-all flex items-center justify-center gap-2"
                  >
                    <Lock className="w-4 h-4" />
                    <span>{isLoading ? 'Авторизация...' : 'Войти в панель'}</span>
                  </button>
                </div>
              </form>

              <div className="mt-6 pt-4 border-t border-slate-800 text-center text-[11px] text-slate-500 flex items-center justify-center gap-1.5">
                <Shield className="w-3 h-3 text-slate-500" />
                <span>Защищенная инженерная зона СК «Волгастрой 76»</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ========================================================
          5. ВСПЛЫВАЮЩИЙ BOTTOM SHEET ФИЛЬТРОВ (МОБИЛЬНЫЙ)
      ======================================================== */}
      {showFilterSheet && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div
            className="w-full sm:max-w-md bg-[#0f172a] border-t sm:border border-slate-750 rounded-t-3xl sm:rounded-3xl p-5 space-y-4 max-h-[85vh] overflow-y-auto"
            style={{
              paddingBottom: isKeyboardOpen ? `${keyboardHeight}px` : 'calc(env(safe-area-inset-bottom) + 16px)',
            }}
          >
            <div className="w-12 h-1 bg-slate-700 rounded-full mx-auto sm:hidden" />
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Filter className="w-4 h-4 text-amber-400" />
                <span>Фильтр смет по статусу</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowFilterSheet(false)}
                className="min-w-[44px] min-h-[44px] flex items-center justify-center text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              {[
                { id: 'all', label: `Все сметы (${estimates.length})` },
                { id: 'draft', label: 'Черновик' },
                { id: 'calculating', label: 'В расчёте' },
                { id: 'sent', label: 'КП отправлено' },
                { id: 'agreed', label: 'Согласование' },
                { id: 'approved', label: 'Утверждено' },
                { id: 'rejected', label: 'Отказ' },
                { id: 'archived', label: 'В архиве' },
              ].map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    setStatusFilter(item.id);
                    setShowFilterSheet(false);
                  }}
                  className={`min-h-[44px] px-3 py-2.5 rounded-xl border font-medium text-left transition-colors ${
                    statusFilter === item.id
                      ? 'bg-amber-600 text-white border-amber-500 shadow-md shadow-amber-600/20'
                      : 'bg-slate-900 text-slate-300 border-slate-800'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>

            <div className="pt-2 flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setStatusFilter('all');
                  setShowFilterSheet(false);
                }}
                className="flex-1 min-h-[44px] py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-medium"
              >
                Сбросить
              </button>
              <button
                type="button"
                onClick={() => setShowFilterSheet(false)}
                className="flex-1 min-h-[44px] py-2.5 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-xl text-xs"
              >
                Применить
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          6. МОДАЛ ВЫБОРА КОМПЛЕКСА / ШАБЛОНА СМЕТЫ
      ======================================================== */}
      {showTemplateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-[#0b132b] border border-slate-700/80 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 sm:py-4 border-b border-slate-800 bg-slate-900/90 shrink-0">
              <div>
                <h3 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
                  <span>🏗️ Выберите начальный состав сметы</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5 hidden sm:block">
                  Смета сразу наполнится профильными разделами, работами, материалами и ценами СК «Волгастрой 76»
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowTemplateModal(false)}
                className="min-w-[44px] min-h-[44px] flex items-center justify-center text-slate-400 hover:text-white rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 sm:p-6 overflow-y-auto space-y-3 sm:space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                {ESTIMATE_TEMPLATES.map((tmpl) => {
                  const worksCount = tmpl.sections.reduce((acc, s) => acc + s.items.length, 0);
                  const matsCount = tmpl.sections.reduce(
                    (acc, s) => acc + s.items.reduce((mAcc, it) => mAcc + (it.materials?.length || 0), 0),
                    0
                  );

                  return (
                    <div
                      key={tmpl.id}
                      onClick={() => handleCreateFromTemplate(tmpl)}
                      className="group bg-[#0f172a] hover:bg-slate-900 border border-slate-800 hover:border-amber-500/80 rounded-2xl p-4 sm:p-5 cursor-pointer transition-all hover:shadow-xl hover:shadow-amber-500/10 flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-start justify-between gap-2.5 mb-2">
                          <div className="flex items-center gap-2.5">
                            <span className="text-2xl p-2 rounded-xl bg-slate-800/80 border border-slate-700/60 group-hover:scale-110 transition-transform">
                              {tmpl.icon || '🏗️'}
                            </span>
                            <div>
                              {tmpl.badge && (
                                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400 bg-amber-950/60 border border-amber-800/60 px-2 py-0.5 rounded-full">
                                  {tmpl.badge}
                                </span>
                              )}
                              <h4 className="text-sm font-bold text-white group-hover:text-amber-300 transition-colors mt-1">
                                {tmpl.name}
                              </h4>
                            </div>
                          </div>
                        </div>

                        {tmpl.description && (
                          <p className="text-xs text-slate-400 leading-relaxed line-clamp-3 mb-3">
                            {tmpl.description}
                          </p>
                        )}
                      </div>

                      <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
                        <div className="flex items-center gap-2 sm:gap-3">
                          <span>📁 <b>{tmpl.sections.length}</b> разд.</span>
                          <span>🔨 <b>{worksCount}</b> работ</span>
                          <span>📦 <b>{matsCount}</b> мат.</span>
                          {tmpl.defaultArea && (
                            <span className="text-amber-400 font-mono">📐 {tmpl.defaultArea} м²</span>
                          )}
                        </div>
                        <span className="text-amber-400 font-bold flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                          Выбрать →
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Создать пустую смету */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() =>
                    handleCreateFromTemplate({
                      id: 'blank',
                      name: 'Индивидуальная смета (с нуля)',
                      description: 'Пустая смета для ручного добавления разделов, работ и материалов',
                      sections: [
                        {
                          name: 'РАЗДЕЛ 1. ОСНОВНЫЕ СТРОИТЕЛЬНО-МОНТАЖНЫЕ РАБОТЫ',
                          items: [],
                        },
                      ],
                    })
                  }
                  className="w-full min-h-[48px] py-3 bg-slate-900/60 hover:bg-slate-800/80 border border-dashed border-slate-700 hover:border-slate-500 rounded-xl text-xs text-slate-400 hover:text-white flex items-center justify-center gap-2 transition-colors font-medium"
                >
                  <Plus className="w-4 h-4" />
                  <span>Создать пустую смету без шаблона</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          7. МОДАЛ ДОБАВЛЕНИЯ ОТЗЫВА
      ======================================================== */}
      {showAddReviewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-lg bg-[#0f172a] border border-slate-750 rounded-2xl p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Star className="w-4 h-4 text-amber-400" />
                <span>Добавление отзыва в базу данных</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowAddReviewModal(false)}
                className="min-w-[44px] min-h-[44px] flex items-center justify-center text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddReviewSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-400 mb-1 font-bold">Имя автора *</label>
                <input
                  type="text"
                  required
                  placeholder="Иван Смирнов"
                  value={revAuthor}
                  onFocus={handleInputFocus}
                  onChange={(e) => setRevAuthor(e.target.value)}
                  className="w-full min-h-[44px] bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-bold">Объект / Локация</label>
                <input
                  type="text"
                  placeholder="Коттедж 140 м², Заволжье"
                  value={revObject}
                  onFocus={handleInputFocus}
                  onChange={(e) => setRevObject(e.target.value)}
                  className="w-full min-h-[44px] bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-bold">Оценка</label>
                <select
                  value={revRating}
                  onChange={(e) => setRevRating(Number(e.target.value))}
                  className="w-full min-h-[44px] bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-amber-400 font-bold"
                >
                  <option value={5}>★★★★★ (5 звёзд - отлично)</option>
                  <option value={4}>★★★★☆ (4 звезды - хорошо)</option>
                  <option value={3}>★★★☆☆ (3 звезды)</option>
                  <option value={2}>★★☆☆☆ (2 звезды)</option>
                  <option value={1}>★☆☆☆☆ (1 звезда)</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-bold">Текст отзыва *</label>
                <textarea
                  rows={3}
                  required
                  placeholder="Текст отзыва заказчика..."
                  value={revText}
                  onFocus={handleInputFocus}
                  onChange={(e) => setRevText(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white"
                />
              </div>

              <div className="flex items-center justify-between pt-2">
                <label className="flex items-center gap-2 cursor-pointer text-slate-300">
                  <input
                    type="checkbox"
                    checked={revApproved}
                    onChange={(e) => setRevApproved(e.target.checked)}
                    className="w-4 h-4 rounded text-amber-600"
                  />
                  <span>Сразу опубликовать на сайте</span>
                </label>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowAddReviewModal(false)}
                    className="min-h-[44px] px-3 py-2 bg-slate-800 text-slate-400 rounded-xl"
                  >
                    Отмена
                  </button>
                  <button
                    type="submit"
                    className="min-h-[44px] px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl"
                  >
                    Сохранить в БД
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

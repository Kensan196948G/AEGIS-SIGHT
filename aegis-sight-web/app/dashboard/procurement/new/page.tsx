'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';

interface FormData {
  title: string;
  category: string;
  items: { name: string; quantity: number; unitPrice: number }[];
  purpose: string;
  department: string;
  priority: string;
  deliveryDate: string;
  notes: string;
}

export default function NewProcurementPage() {
  const router = useRouter();
  const [formData, setFormData] = useState<FormData>({
    title: '',
    category: 'hardware',
    items: [{ name: '', quantity: 1, unitPrice: 0 }],
    purpose: '',
    department: '',
    priority: 'medium',
    deliveryDate: '',
    notes: '',
  });
  const [submitting, setSubmitting] = useState(false);

  function addItem() {
    setFormData((prev) => ({
      ...prev,
      items: [...prev.items, { name: '', quantity: 1, unitPrice: 0 }],
    }));
  }

  function removeItem(index: number) {
    setFormData((prev) => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index),
    }));
  }

  function updateItem(index: number, field: string, value: string | number) {
    setFormData((prev) => ({
      ...prev,
      items: prev.items.map((item, i) =>
        i === index ? { ...item, [field]: value } : item
      ),
    }));
  }

  const totalCost = formData.items.reduce(
    (sum, item) => sum + item.quantity * item.unitPrice,
    0
  );

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1500));
    setSubmitting(false);
    router.push('/dashboard/procurement');
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Page Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => router.back()}
          className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-aegis-surface dark:hover:text-gray-300"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
          </svg>
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">新規調達申請</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            IT機器・ソフトウェアの調達を申請します
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Info */}
        <div className="aegis-card space-y-5">
          <h2 className="text-base font-semibold text-gray-900 dark:text-white">基本情報</h2>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="md:col-span-2">
              <label htmlFor="title" className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                申請タイトル <span className="text-red-500">*</span>
              </label>
              <input
                id="title"
                type="text"
                required
                value={formData.title}
                onChange={(e) => setFormData((p) => ({ ...p, title: e.target.value }))}
                placeholder="例: Dell Latitude 5540 x 20台"
                className="aegis-input"
              />
            </div>

            <div>
              <label htmlFor="category" className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                カテゴリ <span className="text-red-500">*</span>
              </label>
              <select
                id="category"
                value={formData.category}
                onChange={(e) => setFormData((p) => ({ ...p, category: e.target.value }))}
                className="aegis-input"
              >
                <option value="hardware">ハードウェア</option>
                <option value="software">ソフトウェア</option>
                <option value="service">サービス</option>
                <option value="other">その他</option>
              </select>
            </div>

            <div>
              <label htmlFor="department" className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                申請部門 <span className="text-red-500">*</span>
              </label>
              <select
                id="department"
                required
                value={formData.department}
                onChange={(e) => setFormData((p) => ({ ...p, department: e.target.value }))}
                className="aegis-input"
              >
                <option value="">部門を選択</option>
                <option value="engineering">エンジニアリング</option>
                <option value="design">デザイン</option>
                <option value="sales">営業</option>
                <option value="hr">人事</option>
                <option value="finance">経理</option>
                <option value="infrastructure">インフラ</option>
                <option value="it-admin">IT管理</option>
              </select>
            </div>

            <div>
              <label htmlFor="priority" className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                優先度
              </label>
              <select
                id="priority"
                value={formData.priority}
                onChange={(e) => setFormData((p) => ({ ...p, priority: e.target.value }))}
                className="aegis-input"
              >
                <option value="low">低</option>
                <option value="medium">中</option>
                <option value="high">高</option>
                <option value="urgent">緊急</option>
              </select>
            </div>

            <div>
              <label htmlFor="deliveryDate" className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                希望納期
              </label>
              <input
                id="deliveryDate"
                type="date"
                value={formData.deliveryDate}
                onChange={(e) => setFormData((p) => ({ ...p, deliveryDate: e.target.value }))}
                className="aegis-input"
              />
            </div>
          </div>

          <div>
            <label htmlFor="purpose" className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
              調達目的 <span className="text-red-500">*</span>
            </label>
            <textarea
              id="purpose"
              required
              rows={3}
              value={formData.purpose}
              onChange={(e) => setFormData((p) => ({ ...p, purpose: e.target.value }))}
              placeholder="調達の目的・背景を記入してください"
              className="aegis-input resize-none"
            />
          </div>
        </div>

        {/* Items */}
        <div className="aegis-card space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-gray-900 dark:text-white">品目明細</h2>
            <button
              type="button"
              onClick={addItem}
              className="aegis-btn-secondary text-xs"
            >
              <svg className="mr-1.5 h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              品目を追加
            </button>
          </div>

          <div className="space-y-3">
            {formData.items.map((item, index) => (
              <div
                key={index}
                className="grid grid-cols-12 items-end gap-3 rounded-lg border border-gray-200 bg-gray-50/50 p-4 dark:border-aegis-border dark:bg-aegis-dark/30"
              >
                <div className="col-span-5">
                  <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">
                    品目名
                  </label>
                  <input
                    type="text"
                    required
                    value={item.name}
                    onChange={(e) => updateItem(index, 'name', e.target.value)}
                    placeholder="例: Dell Latitude 5540"
                    className="aegis-input text-sm"
                  />
                </div>
                <div className="col-span-2">
                  <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">
                    数量
                  </label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={item.quantity}
                    onChange={(e) => updateItem(index, 'quantity', parseInt(e.target.value) || 0)}
                    className="aegis-input text-sm"
                  />
                </div>
                <div className="col-span-3">
                  <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">
                    単価 (円)
                  </label>
                  <input
                    type="number"
                    required
                    min={0}
                    value={item.unitPrice}
                    onChange={(e) => updateItem(index, 'unitPrice', parseInt(e.target.value) || 0)}
                    className="aegis-input text-sm"
                  />
                </div>
                <div className="col-span-2 flex items-end gap-2">
                  <div className="flex-1 text-right">
                    <p className="text-xs text-gray-500 dark:text-gray-400">小計</p>
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">
                      {(item.quantity * item.unitPrice).toLocaleString()}円
                    </p>
                  </div>
                  {formData.items.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeItem(index)}
                      className="rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-900/20"
                    >
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                      </svg>
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Total */}
          <div className="flex items-center justify-end gap-4 border-t border-gray-200 pt-4 dark:border-aegis-border">
            <span className="text-sm font-medium text-gray-600 dark:text-gray-400">合計金額:</span>
            <span className="text-2xl font-bold text-gray-900 dark:text-white">
              {totalCost.toLocaleString()}円
            </span>
          </div>
        </div>

        {/* Notes */}
        <div className="aegis-card">
          <label htmlFor="notes" className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
            備考
          </label>
          <textarea
            id="notes"
            rows={3}
            value={formData.notes}
            onChange={(e) => setFormData((p) => ({ ...p, notes: e.target.value }))}
            placeholder="補足事項があれば記入してください"
            className="aegis-input resize-none"
          />
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={() => router.back()}
            className="aegis-btn-secondary"
          >
            キャンセル
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="aegis-btn-secondary"
          >
            下書き保存
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="aegis-btn-primary disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? (
              <>
                <svg className="mr-2 h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                送信中...
              </>
            ) : (
              '申請を提出'
            )}
          </button>
        </div>
      </form>
    </div>
  );
}

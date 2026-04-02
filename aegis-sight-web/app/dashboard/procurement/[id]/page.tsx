'use client';

import { useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { Modal } from '@/components/ui/modal';

type Status = 'draft' | 'submitted' | 'approved' | 'rejected' | 'ordered' | 'delivered' | 'completed';
type Priority = 'low' | 'medium' | 'high' | 'urgent';

interface ProcurementItem { name: string; quantity: number; unitPrice: number; subtotal: number; }
interface Approver { name: string; role: string; status: 'approved' | 'pending' | 'rejected'; date: string; comment?: string; }
interface TimelineEvent { date: string; event: string; user: string; detail: string; }

interface ProcurementDetail {
  id: string;
  title: string;
  description: string;
  requesterName: string;
  requesterEmail: string;
  department: string;
  category: string;
  priority: Priority;
  status: Status;
  estimatedCost: number;
  currency: string;
  createdAt: string;
  updatedAt: string;
  deliveryDate: string;
  items: ProcurementItem[];
  approvers: Approver[];
  timeline: TimelineEvent[];
}

const PROCUREMENT_DETAILS: Record<string, ProcurementDetail> = {
  'PR-2026-001': {
    id: 'PR-2026-001', title: 'Dell Latitude 5540 x 20台',
    description: '新入社員向けの業務用ノートPCの調達。エンジニアリング部門の増員に伴い、標準スペックのノートPCが必要。Intel Core i7、16GB RAM、512GB SSDを標準構成とし、開発作業に耐えうるスペックを確保する。',
    requesterName: '田中 太郎', requesterEmail: 'tanaka@aegis-sight.local', department: 'エンジニアリング',
    category: 'ハードウェア', priority: 'high', status: 'approved', estimatedCost: 3200000, currency: 'JPY',
    createdAt: '2026-03-14 10:30', updatedAt: '2026-03-15 16:00', deliveryDate: '2026-04-30',
    items: [
      { name: 'Dell Latitude 5540 (i7/16GB/512GB)', quantity: 20, unitPrice: 145000, subtotal: 2900000 },
      { name: 'Dell USB-Cドッキングステーション WD19S', quantity: 20, unitPrice: 15000, subtotal: 300000 },
    ],
    approvers: [
      { name: '鈴木部長', role: '部門長', status: 'approved', date: '2026-03-15', comment: '承認します。仕様は問題ありません。' },
      { name: '山本課長', role: 'IT管理', status: 'approved', date: '2026-03-15', comment: '在庫確認済み。標準構成です。' },
    ],
    timeline: [
      { date: '2026-03-14 10:30', event: '申請作成', user: '田中 太郎', detail: '調達申請が作成されました' },
      { date: '2026-03-14 11:00', event: '申請提出', user: '田中 太郎', detail: '承認ワークフローに提出されました' },
      { date: '2026-03-15 14:20', event: '部門長承認', user: '鈴木部長', detail: '部門長が承認しました' },
      { date: '2026-03-15 16:00', event: 'IT管理承認', user: '山本課長', detail: 'IT管理部門が承認しました' },
    ],
  },
  'PR-2026-002': {
    id: 'PR-2026-002', title: 'Adobe CC ライセンス追加 10本',
    description: 'デザイン部門の人員増加に伴い、Adobe Creative Cloud ライセンスを10本追加。現在58本超過状態が発生しており、コンプライアンス対応として早急に購入が必要。',
    requesterName: '佐藤 花子', requesterEmail: 'sato@aegis-sight.local', department: 'デザイン',
    category: 'ソフトウェア', priority: 'medium', status: 'submitted', estimatedCost: 720000, currency: 'JPY',
    createdAt: '2026-03-19 09:00', updatedAt: '2026-03-20 10:30', deliveryDate: '2026-04-15',
    items: [
      { name: 'Adobe Creative Cloud All Apps (1年間)', quantity: 10, unitPrice: 72000, subtotal: 720000 },
    ],
    approvers: [
      { name: '中山部長', role: '部門長', status: 'pending', date: '-', comment: '' },
    ],
    timeline: [
      { date: '2026-03-19 09:00', event: '申請作成', user: '佐藤 花子', detail: '調達申請が作成されました' },
      { date: '2026-03-20 10:30', event: '申請提出', user: '佐藤 花子', detail: '承認ワークフローに提出されました' },
    ],
  },
  'PR-2026-003': {
    id: 'PR-2026-003', title: 'Cisco Catalyst 9300 スイッチ',
    description: 'インフラ更新計画の一環として、本社ネットワーク基幹スイッチをCisco Catalyst 9300に置き換え。既存Catalyst 3650のEOL対応。',
    requesterName: '山田 次郎', requesterEmail: 'yamada@aegis-sight.local', department: 'インフラ',
    category: 'ネットワーク', priority: 'high', status: 'submitted', estimatedCost: 1500000, currency: 'JPY',
    createdAt: '2026-03-21 14:00', updatedAt: '2026-03-22 09:00', deliveryDate: '2026-05-31',
    items: [
      { name: 'Cisco Catalyst C9300-48P-E', quantity: 2, unitPrice: 600000, subtotal: 1200000 },
      { name: 'Cisco StackWise-480 ケーブル 1M', quantity: 1, unitPrice: 150000, subtotal: 150000 },
      { name: 'ラックマウントキット', quantity: 2, unitPrice: 75000, subtotal: 150000 },
    ],
    approvers: [
      { name: '小林部長', role: '部門長', status: 'pending', date: '-', comment: '' },
      { name: '山本課長', role: 'IT管理', status: 'pending', date: '-', comment: '' },
    ],
    timeline: [
      { date: '2026-03-21 14:00', event: '申請作成', user: '山田 次郎', detail: '調達申請が作成されました' },
      { date: '2026-03-22 09:00', event: '申請提出', user: '山田 次郎', detail: '承認ワークフローに提出されました' },
    ],
  },
  'PR-2026-004': {
    id: 'PR-2026-004', title: '27インチ 4K モニター x 15台',
    description: '営業部門のリモートワーク強化および生産性向上のため、27インチ 4Kモニターを15台調達。現状の24インチFHDからのアップグレード。',
    requesterName: '鈴木 一郎', requesterEmail: 'suzuki@aegis-sight.local', department: '営業',
    category: '周辺機器', priority: 'low', status: 'draft', estimatedCost: 900000, currency: 'JPY',
    createdAt: '2026-03-25 11:00', updatedAt: '2026-03-25 11:00', deliveryDate: '2026-05-15',
    items: [
      { name: 'LG 27UK850-W 4K IPS USB-C モニター', quantity: 15, unitPrice: 60000, subtotal: 900000 },
    ],
    approvers: [],
    timeline: [
      { date: '2026-03-25 11:00', event: '申請作成', user: '鈴木 一郎', detail: '下書きとして保存されました' },
    ],
  },
  'PR-2026-005': {
    id: 'PR-2026-005', title: 'Microsoft 365 E5 アップグレード',
    description: 'Microsoft 365 E3からE5へのアップグレード。Defender for Endpoint P2、Azure AD Premium P2、Purview Information Protection等の高度なセキュリティ機能を利用するため。',
    requesterName: '高橋 美咲', requesterEmail: 'takahashi@aegis-sight.local', department: 'IT管理',
    category: 'ソフトウェア', priority: 'medium', status: 'ordered', estimatedCost: 2400000, currency: 'JPY',
    createdAt: '2026-03-08 10:00', updatedAt: '2026-03-12 14:00', deliveryDate: '2026-04-01',
    items: [
      { name: 'Microsoft 365 E5 アップグレード (500ユーザー/年)', quantity: 500, unitPrice: 4800, subtotal: 2400000 },
    ],
    approvers: [
      { name: '山本課長', role: 'IT管理', status: 'approved', date: '2026-03-10', comment: 'セキュリティ強化に必要。承認。' },
      { name: '田村取締役', role: 'CIO', status: 'approved', date: '2026-03-12', comment: '予算内。セキュリティ投資として承認。' },
    ],
    timeline: [
      { date: '2026-03-08 10:00', event: '申請作成', user: '高橋 美咲', detail: '調達申請が作成されました' },
      { date: '2026-03-08 10:30', event: '申請提出', user: '高橋 美咲', detail: '承認ワークフローに提出されました' },
      { date: '2026-03-10 11:00', event: 'IT管理承認', user: '山本課長', detail: 'IT管理部門が承認しました' },
      { date: '2026-03-12 14:00', event: '最終承認', user: '田村取締役', detail: 'CIOが最終承認しました' },
      { date: '2026-03-13 09:00', event: '発注', user: 'IT管理部', detail: 'Microsoftへ発注が完了しました' },
    ],
  },
  'PR-2026-006': {
    id: 'PR-2026-006', title: 'HP EliteBook 840 G10 x 5台',
    description: '経理部門の老朽化PC（5年以上使用）の更新。セキュリティパッチ適用不可の旧OSからの移行も兼ねる。',
    requesterName: '中村 健太', requesterEmail: 'nakamura@aegis-sight.local', department: '経理',
    category: 'ハードウェア', priority: 'medium', status: 'delivered', estimatedCost: 750000, currency: 'JPY',
    createdAt: '2026-02-28 14:00', updatedAt: '2026-03-20 10:00', deliveryDate: '2026-03-20',
    items: [
      { name: 'HP EliteBook 840 G10 (i5/16GB/256GB)', quantity: 5, unitPrice: 130000, subtotal: 650000 },
      { name: 'HP USB-Cドック G5', quantity: 5, unitPrice: 20000, subtotal: 100000 },
    ],
    approvers: [
      { name: '鈴木部長', role: '部門長', status: 'approved', date: '2026-03-02', comment: '更新必要。承認。' },
      { name: '山本課長', role: 'IT管理', status: 'approved', date: '2026-03-03', comment: '資産台帳確認済み。' },
    ],
    timeline: [
      { date: '2026-02-28 14:00', event: '申請作成', user: '中村 健太', detail: '調達申請が作成されました' },
      { date: '2026-02-28 15:00', event: '申請提出', user: '中村 健太', detail: '承認ワークフローに提出されました' },
      { date: '2026-03-02 10:00', event: '部門長承認', user: '鈴木部長', detail: '部門長が承認しました' },
      { date: '2026-03-03 11:00', event: 'IT管理承認', user: '山本課長', detail: 'IT管理部門が承認しました' },
      { date: '2026-03-04 09:00', event: '発注', user: 'IT管理部', detail: 'HPダイレクトへ発注が完了しました' },
      { date: '2026-03-20 10:00', event: '納品', user: 'IT管理部', detail: '5台の納品が完了しました' },
    ],
  },
  'PR-2026-007': {
    id: 'PR-2026-007', title: 'Fortinet FortiGate 60F',
    description: '現行UTMの老朽化に伴う緊急交換。セキュリティパッチサポート終了のため、即時対応が必要。新拠点の開設に合わせてFortiGate 60Fを導入し、SSL-VPN・IPS・WAFを統合管理する。',
    requesterName: '小林 真一', requesterEmail: 'kobayashi@aegis-sight.local', department: 'インフラ',
    category: 'セキュリティ', priority: 'urgent', status: 'approved', estimatedCost: 480000, currency: 'JPY',
    createdAt: '2026-03-27 09:00', updatedAt: '2026-03-28 12:00', deliveryDate: '2026-04-07',
    items: [
      { name: 'Fortinet FortiGate 60F (本体)', quantity: 1, unitPrice: 380000, subtotal: 380000 },
      { name: 'FortiCare Premium 1年間', quantity: 1, unitPrice: 60000, subtotal: 60000 },
      { name: 'FortiGuard UTMバンドル 1年間', quantity: 1, unitPrice: 40000, subtotal: 40000 },
    ],
    approvers: [
      { name: '山本課長', role: 'IT管理', status: 'approved', date: '2026-03-28', comment: '緊急案件。即時承認。' },
      { name: '田村取締役', role: 'CIO', status: 'approved', date: '2026-03-28', comment: 'セキュリティリスク対応として承認。' },
    ],
    timeline: [
      { date: '2026-03-27 09:00', event: '申請作成', user: '小林 真一', detail: '緊急調達申請が作成されました' },
      { date: '2026-03-27 09:15', event: '申請提出', user: '小林 真一', detail: '緊急承認フローに提出されました' },
      { date: '2026-03-28 11:00', event: 'IT管理承認', user: '山本課長', detail: '緊急対応として即時承認しました' },
      { date: '2026-03-28 12:00', event: '最終承認', user: '田村取締役', detail: 'CIOが緊急承認しました' },
    ],
  },
  'PR-2026-008': {
    id: 'PR-2026-008', title: 'Epson エコタンク複合機 x 3台',
    description: '総務部門のコスト削減目的で、インクカートリッジ式から大容量エコタンク式複合機への切り替えを申請。',
    requesterName: '松本 あかね', requesterEmail: 'matsumoto@aegis-sight.local', department: '総務',
    category: '周辺機器', priority: 'low', status: 'rejected', estimatedCost: 210000, currency: 'JPY',
    createdAt: '2026-03-17 10:00', updatedAt: '2026-03-18 14:00', deliveryDate: '2026-04-30',
    items: [
      { name: 'Epson EW-M752T エコタンク複合機', quantity: 3, unitPrice: 70000, subtotal: 210000 },
    ],
    approvers: [
      { name: '鈴木部長', role: '部門長', status: 'rejected', date: '2026-03-18', comment: '既存複合機のリース契約が残っているため却下。リース終了後に再申請すること。' },
    ],
    timeline: [
      { date: '2026-03-17 10:00', event: '申請作成', user: '松本 あかね', detail: '調達申請が作成されました' },
      { date: '2026-03-17 11:00', event: '申請提出', user: '松本 あかね', detail: '承認ワークフローに提出されました' },
      { date: '2026-03-18 14:00', event: '申請却下', user: '鈴木部長', detail: 'リース契約の残存を理由に却下されました' },
    ],
  },
  'PR-2026-009': {
    id: 'PR-2026-009', title: 'VMware vSphere 8 ライセンス',
    description: 'インフラ仮想化基盤のvSphere 7からvSphere 8へのアップグレード。NSX-T統合とKubernetes対応強化のため。本番・開発・DR環境合計15ホスト分のライセンス更新を含む。',
    requesterName: '渡辺 剛', requesterEmail: 'watanabe@aegis-sight.local', department: 'インフラ',
    category: 'ソフトウェア', priority: 'high', status: 'completed', estimatedCost: 1800000, currency: 'JPY',
    createdAt: '2026-02-18 14:00', updatedAt: '2026-03-15 11:00', deliveryDate: '2026-03-15',
    items: [
      { name: 'VMware vSphere 8 Enterprise Plus (25 CPUコア)', quantity: 3, unitPrice: 480000, subtotal: 1440000 },
      { name: 'VMware vCenter Server 8 Standard', quantity: 1, unitPrice: 360000, subtotal: 360000 },
    ],
    approvers: [
      { name: '小林部長', role: '部門長', status: 'approved', date: '2026-02-22', comment: 'インフラ年次計画内。承認。' },
      { name: '山本課長', role: 'IT管理', status: 'approved', date: '2026-02-23', comment: '仮想化戦略と整合。承認。' },
      { name: '田村取締役', role: 'CIO', status: 'approved', date: '2026-02-25', comment: '予算承認済み。' },
    ],
    timeline: [
      { date: '2026-02-18 14:00', event: '申請作成', user: '渡辺 剛', detail: '調達申請が作成されました' },
      { date: '2026-02-20 09:00', event: '申請提出', user: '渡辺 剛', detail: '承認ワークフローに提出されました' },
      { date: '2026-02-22 10:00', event: '部門長承認', user: '小林部長', detail: '部門長が承認しました' },
      { date: '2026-02-23 14:00', event: 'IT管理承認', user: '山本課長', detail: 'IT管理部門が承認しました' },
      { date: '2026-02-25 11:00', event: '最終承認', user: '田村取締役', detail: 'CIOが最終承認しました' },
      { date: '2026-02-26 09:00', event: '発注', user: 'IT管理部', detail: 'VMwareパートナーへ発注完了' },
      { date: '2026-03-10 11:00', event: 'ライセンスキー受領', user: 'IT管理部', detail: 'ライセンスキーがメールで送付されました' },
      { date: '2026-03-15 11:00', event: '完了', user: '渡辺 剛', detail: 'ライセンス適用・動作確認完了' },
    ],
  },
  'PR-2026-010': {
    id: 'PR-2026-010', title: 'iPad Pro 12.9" + Apple Pencil x 10台',
    description: '建設現場でのデジタル図面閲覧・工程管理・写真記録のためにiPad Proを導入。AEGIS-SIGHTのPWA機能を活用し、オフライン環境でも資産管理・現場報告が可能。',
    requesterName: '伊藤 沙織', requesterEmail: 'ito@aegis-sight.local', department: '建設現場',
    category: 'モバイル', priority: 'medium', status: 'submitted', estimatedCost: 1600000, currency: 'JPY',
    createdAt: '2026-03-29 10:00', updatedAt: '2026-03-30 09:00', deliveryDate: '2026-05-01',
    items: [
      { name: 'Apple iPad Pro 12.9" M2 (256GB Wi-Fi+Cellular)', quantity: 10, unitPrice: 140000, subtotal: 1400000 },
      { name: 'Apple Pencil (第2世代)', quantity: 10, unitPrice: 19000, subtotal: 190000 },
      { name: 'Apple Magic Keyboard for iPad Pro 12.9"', quantity: 5, unitPrice: 10000, subtotal: 10000 },
    ],
    approvers: [
      { name: '中山部長', role: '部門長', status: 'pending', date: '-', comment: '' },
      { name: '山本課長', role: 'IT管理', status: 'pending', date: '-', comment: '' },
    ],
    timeline: [
      { date: '2026-03-29 10:00', event: '申請作成', user: '伊藤 沙織', detail: '調達申請が作成されました' },
      { date: '2026-03-30 09:00', event: '申請提出', user: '伊藤 沙織', detail: '承認ワークフローに提出されました' },
    ],
  },
};

const statusFlow: Record<Status, Status[]> = {
  draft: ['submitted'],
  submitted: ['approved', 'rejected'],
  approved: ['ordered'],
  rejected: [],
  ordered: ['delivered'],
  delivered: ['completed'],
  completed: [],
};

const statusConfig: Record<Status, { label: string; variant: 'default' | 'info' | 'success' | 'danger' | 'warning' | 'purple' }> = {
  draft:     { label: '下書き', variant: 'default' },
  submitted: { label: '申請中', variant: 'info' },
  approved:  { label: '承認済', variant: 'success' },
  rejected:  { label: '却下', variant: 'danger' },
  ordered:   { label: '発注済', variant: 'purple' },
  delivered: { label: '納品済', variant: 'success' },
  completed: { label: '完了', variant: 'default' },
};

const priorityConfig: Record<Priority, { label: string; variant: 'default' | 'warning' | 'danger' }> = {
  low:    { label: '低', variant: 'default' },
  medium: { label: '中', variant: 'warning' },
  high:   { label: '高', variant: 'danger' },
  urgent: { label: '緊急', variant: 'danger' },
};

const allStatuses: Status[] = ['draft', 'submitted', 'approved', 'ordered', 'delivered', 'completed'];

export default function ProcurementDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = Array.isArray(params.id) ? params.id[0] : (params.id ?? '');

  const procurementDetail = PROCUREMENT_DETAILS[id];

  const [currentStatus, setCurrentStatus] = useState<Status>(procurementDetail?.status ?? 'draft');
  const [showModal, setShowModal] = useState(false);
  const [nextStatus, setNextStatus] = useState<Status | null>(null);

  if (!procurementDetail) {
    return (
      <div className="mx-auto max-w-5xl space-y-6">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.back()}
            className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-aegis-surface dark:hover:text-gray-300"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
            </svg>
          </button>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">申請が見つかりません</h1>
        </div>
        <div className="aegis-card text-center py-12">
          <p className="text-gray-500 dark:text-gray-400">申請番号 <span className="font-mono font-semibold">{id}</span> は存在しません。</p>
        </div>
      </div>
    );
  }

  const nextStatuses = statusFlow[currentStatus] || [];

  function handleStatusChange(status: Status) {
    setNextStatus(status);
    setShowModal(true);
  }

  function confirmStatusChange() {
    if (nextStatus) {
      setCurrentStatus(nextStatus);
    }
    setShowModal(false);
    setNextStatus(null);
  }

  const currentStepIndex = allStatuses.indexOf(currentStatus);

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
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
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                {procurementDetail.id}
              </h1>
              <Badge variant={statusConfig[currentStatus].variant} size="md">
                {statusConfig[currentStatus].label}
              </Badge>
              <Badge variant={priorityConfig[procurementDetail.priority].variant}>
                優先度: {priorityConfig[procurementDetail.priority].label}
              </Badge>
            </div>
            <p className="mt-1 text-lg text-gray-700 dark:text-gray-300">
              {procurementDetail.title}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          {nextStatuses.map((status) => (
            <button
              key={status}
              onClick={() => handleStatusChange(status)}
              className={status === 'rejected' ? 'aegis-btn-secondary text-red-600' : 'aegis-btn-primary'}
            >
              {statusConfig[status].label}にする
            </button>
          ))}
        </div>
      </div>

      {/* Status Progress */}
      <div className="aegis-card">
        <h2 className="mb-4 text-sm font-semibold text-gray-900 dark:text-white">
          ステータス進捗
        </h2>
        <div className="flex items-center">
          {allStatuses
            .filter((s) => s !== 'rejected')
            .map((status, index, arr) => {
              const isCompleted = allStatuses.indexOf(status) <= currentStepIndex;
              const isCurrent = status === currentStatus;

              return (
                <div key={status} className="flex flex-1 items-center">
                  <div className="flex flex-col items-center">
                    <div
                      className={`flex h-8 w-8 items-center justify-center rounded-full border-2 text-xs font-semibold transition-colors ${
                        isCompleted
                          ? 'border-primary-600 bg-primary-600 text-white'
                          : isCurrent
                          ? 'border-primary-600 bg-white text-primary-600 dark:bg-aegis-dark'
                          : 'border-gray-300 bg-white text-gray-400 dark:border-gray-600 dark:bg-aegis-dark'
                      }`}
                    >
                      {isCompleted && !isCurrent ? (
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                        </svg>
                      ) : (
                        index + 1
                      )}
                    </div>
                    <span className={`mt-1.5 text-[10px] font-medium ${
                      isCompleted ? 'text-primary-600 dark:text-primary-400' : 'text-gray-400'
                    }`}>
                      {statusConfig[status].label}
                    </span>
                  </div>
                  {index < arr.length - 1 && (
                    <div
                      className={`mx-1 h-0.5 flex-1 ${
                        allStatuses.indexOf(status) < currentStepIndex
                          ? 'bg-primary-600'
                          : 'bg-gray-200 dark:bg-gray-700'
                      }`}
                    />
                  )}
                </div>
              );
            })}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left: Details */}
        <div className="space-y-6 lg:col-span-2">
          {/* Description */}
          <div className="aegis-card">
            <h2 className="mb-3 text-base font-semibold text-gray-900 dark:text-white">
              申請内容
            </h2>
            <p className="text-sm leading-relaxed text-gray-700 dark:text-gray-300">
              {procurementDetail.description}
            </p>
          </div>

          {/* Items Table */}
          <div className="aegis-card overflow-hidden p-0">
            <div className="border-b border-gray-200 px-6 py-3 dark:border-aegis-border">
              <h2 className="text-base font-semibold text-gray-900 dark:text-white">
                品目明細
              </h2>
            </div>
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50/50 dark:border-aegis-border dark:bg-aegis-dark/50">
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">品目</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-500">数量</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-500">単価</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-500">小計</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-aegis-border">
                {procurementDetail.items.map((item, i) => (
                  <tr key={i}>
                    <td className="px-6 py-4 text-sm font-medium text-gray-900 dark:text-white">{item.name}</td>
                    <td className="px-6 py-4 text-right text-sm text-gray-600 dark:text-gray-400">{item.quantity}</td>
                    <td className="px-6 py-4 text-right text-sm text-gray-600 dark:text-gray-400">{item.unitPrice.toLocaleString()}円</td>
                    <td className="px-6 py-4 text-right text-sm font-medium text-gray-900 dark:text-white">{item.subtotal.toLocaleString()}円</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-gray-200 dark:border-aegis-border">
                  <td colSpan={3} className="px-6 py-4 text-right text-sm font-semibold text-gray-900 dark:text-white">合計</td>
                  <td className="px-6 py-4 text-right text-lg font-bold text-primary-600 dark:text-primary-400">
                    {procurementDetail.estimatedCost.toLocaleString()}円
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Approvers */}
          {procurementDetail.approvers.length > 0 && (
            <div className="aegis-card">
              <h2 className="mb-4 text-base font-semibold text-gray-900 dark:text-white">
                承認者
              </h2>
              <div className="space-y-3">
                {procurementDetail.approvers.map((approver, i) => (
                  <div key={i} className="flex items-start gap-4 rounded-lg border border-gray-200 p-4 dark:border-aegis-border">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-100 text-sm font-semibold text-primary-700 dark:bg-primary-900/30 dark:text-primary-400">
                      {approver.name.charAt(0)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-gray-900 dark:text-white">{approver.name}</span>
                        <span className="text-xs text-gray-500 dark:text-gray-400">({approver.role})</span>
                        <Badge variant={approver.status === 'approved' ? 'success' : approver.status === 'rejected' ? 'danger' : 'warning'} size="sm">
                          {approver.status === 'approved' ? '承認済' : approver.status === 'rejected' ? '却下' : '保留中'}
                        </Badge>
                      </div>
                      {approver.comment && (
                        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                          {approver.comment}
                        </p>
                      )}
                      <p className="mt-1 text-xs text-gray-400">{approver.date}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right: Info & Timeline */}
        <div className="space-y-6">
          {/* Info Card */}
          <div className="aegis-card">
            <h2 className="mb-4 text-base font-semibold text-gray-900 dark:text-white">
              申請情報
            </h2>
            <dl className="space-y-3">
              {[
                { label: '申請者', value: procurementDetail.requesterName },
                { label: 'メール', value: procurementDetail.requesterEmail },
                { label: '部門', value: procurementDetail.department },
                { label: 'カテゴリ', value: procurementDetail.category },
                { label: '作成日', value: procurementDetail.createdAt },
                { label: '更新日', value: procurementDetail.updatedAt },
                { label: '希望納期', value: procurementDetail.deliveryDate },
              ].map((info) => (
                <div key={info.label} className="flex justify-between">
                  <dt className="text-xs text-gray-500 dark:text-gray-400">{info.label}</dt>
                  <dd className="text-sm font-medium text-gray-900 dark:text-white">{info.value}</dd>
                </div>
              ))}
            </dl>
          </div>

          {/* Timeline */}
          <div className="aegis-card">
            <h2 className="mb-4 text-base font-semibold text-gray-900 dark:text-white">
              タイムライン
            </h2>
            <div className="space-y-0">
              {procurementDetail.timeline.map((event, i) => (
                <div key={i} className="relative flex gap-3 pb-6 last:pb-0">
                  {i < procurementDetail.timeline.length - 1 && (
                    <div className="absolute left-[11px] top-6 h-full w-0.5 bg-gray-200 dark:bg-gray-700" />
                  )}
                  <div className="relative z-10 mt-1 h-6 w-6 shrink-0">
                    <div className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-primary-500 bg-white dark:bg-aegis-dark">
                      <div className="h-2 w-2 rounded-full bg-primary-500" />
                    </div>
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {event.event}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {event.detail}
                    </p>
                    <div className="mt-1 flex items-center gap-2 text-[10px] text-gray-400">
                      <span>{event.user}</span>
                      <span>{event.date}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Status Change Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title="ステータスを変更"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            ステータスを
            <span className="mx-1 font-semibold text-gray-900 dark:text-white">
              {statusConfig[currentStatus].label}
            </span>
            から
            <span className="mx-1 font-semibold text-primary-600 dark:text-primary-400">
              {nextStatus ? statusConfig[nextStatus].label : ''}
            </span>
            に変更しますか?
          </p>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
              コメント（任意）
            </label>
            <textarea
              rows={3}
              placeholder="変更理由やコメントを入力"
              className="aegis-input resize-none"
            />
          </div>
          <div className="flex justify-end gap-3">
            <button onClick={() => setShowModal(false)} className="aegis-btn-secondary">
              キャンセル
            </button>
            <button onClick={confirmStatusChange} className="aegis-btn-primary">
              変更を確定
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

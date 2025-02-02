<template>
  <div class="page">
    <header class="header">
      <div class="toolbar">
        <h1>Invoice Summary</h1>
      </div>
    </header>
    
    <main class="content ion-padding">
      <!-- Invoice 정보 카드 -->
      <div class="card">
        <div class="card-content">
          <h2>Invoice #{{ invoiceData.invoiceNumber }}</h2>
          <p><strong>Date:</strong> {{ invoiceData.invoiceDate }}</p>
        </div>
      </div>
      
      <!-- Billing 정보 카드 (조건부 렌더링) -->
      <div v-if="invoiceData.showBillSection" class="card">
        <div class="card-content">
          <h3>Billing Information</h3>
          <p><strong>Company:</strong> {{ invoiceData.billInfo.companyName }}</p>
          <p><strong>VAT No.:</strong> {{ invoiceData.billInfo.vatNo }}</p>
          <p><strong>Address:</strong> {{ invoiceData.billInfo.street }}, {{ invoiceData.billInfo.city }}</p>
          <p><strong>Postal Code:</strong> {{ invoiceData.billInfo.postalCode }}</p>
          <p><strong>Country:</strong> {{ invoiceData.billInfo.country }}</p>
          <p><strong>Email:</strong> {{ invoiceData.billInfo.email }}</p>
        </div>
      </div>
      
      <!-- Items 카드 -->
      <div class="card">
        <div class="card-content">
          <h3>Items</h3>
          <div v-for="(item, index) in invoiceData.items" :key="index" class="item-container">
            <p><strong>Description:</strong> {{ item.description }}</p>
            <p><strong>Amount:</strong> €{{ item.amount.toFixed(2) }}</p>
            <p><strong>Tax (21%):</strong> €{{ item.tax.toFixed(2) }}</p>
            <p><strong>Price (Excl. Tax):</strong> €{{ item.price.toFixed(2) }}</p>
          </div>
        </div>
      </div>
      
      <!-- 총 금액 카드 -->
      <div class="card">
        <div class="card-content">
          <h2>Total Amount: €{{ totalAmount.toFixed(2) }}</h2>
        </div>
      </div>
      
      <!-- 액션 버튼들 -->
      <!-- Download PDF 버튼: 단순히 PDF 다운로드만 수행 -->
      <button class="btn btn-secondary" @click="downloadPDF">Download PDF</button>
      <!-- Send Email 버튼: PDF 공유 후 추가 작업 수행 -->
      <button class="btn btn-secondary" @click="sendEmail">Send Email</button>
      <button class="btn btn-primary" @click="goBack">Back</button>
      
      <!-- 로딩 스피너 (간단한 오버레이) -->
      <div v-if="loading" class="loading-overlay">
        <div class="spinner"></div>
        <p>Sending email...</p>
      </div>
      
    </main>
  </div>
</template>

<script setup>
// eslint-disable-next-line no-undef
/* global defineExpose */

import { ref, onMounted, onUnmounted, createApp } from 'vue';
import { useRouter } from 'vue-router';
import InvoicePDF from '@/components/InvoicePDF.vue';
import { pushInvoice } from '@/utils/firebaseHelper.js';
import { incrementInvoiceNumber } from '@/utils/firebaseHelper.js';

const router = useRouter();
const loading = ref(false);
let pdfApp = null;         // InvoicePDF 앱 인스턴스
let pdfContainer = null;   // InvoicePDF 마운트 컨테이너
let instance = null;       // InvoicePDF 인스턴스

const invoiceData = ref({
  invoiceNumber: localStorage.getItem("invoiceNumber") || "1",
  invoiceDate: '',
  showBillSection: false,
  billInfo: {
    companyName: '',
    vatNo: '',
    street: '',
    city: '',
    postalCode: '',
    country: '',
    email: ''
  },
  items: [],
  invoiceModified: false
});

onMounted(() => {
  const storedData = sessionStorage.getItem('invoiceData');
  if (storedData) {
    invoiceData.value = JSON.parse(storedData);
  }

  // InvoicePDF를 미리 마운트
  pdfContainer = document.createElement('div');
  pdfContainer.style.position = 'absolute';
  pdfContainer.style.left = '-9999px'; // 화면 밖으로 이동
  document.body.appendChild(pdfContainer);

  pdfApp = createApp(InvoicePDF);
  instance = pdfApp.mount(pdfContainer);
});

onUnmounted(() => {
  // InvoicePDF 앱 언마운트 및 DOM 정리
  if (pdfApp) {
    pdfApp.unmount();
    pdfApp = null;
  }
  if (pdfContainer) {
    document.body.removeChild(pdfContainer);
    pdfContainer = null;
  }
  instance = null;
});

const totalAmount = ref(0);
onMounted(() => {
  totalAmount.value = invoiceData.value.items.reduce((sum, item) => sum + (item.amount || 0), 0);
});

const goBack = () => {
  router.back();
};

// downloadPDF 함수: PDF 파일을 생성 후 단순히 다운로드만 실행
const downloadPDF = async () => {
  console.log("Download PDF initiated...");
  try {
    if (instance && instance.downloadPDF) {
      await instance.downloadPDF();
    } else {
      console.error("downloadPDF function is not available on instance.");
    }
  } catch (error) {
    console.error("Error downloading PDF:", error);
  }
};

// sendEmail 함수: PDF 공유 기능과 추가 작업을 수행 (CSV 저장, 페이지 이동 등)
const sendEmail = async () => {
  loading.value = true; // 로딩 시작
  console.log("Sending invoice via email...");

  try {
    // InvoicePDF의 sendEmail 실행 (PDF 공유)
    if (instance && instance.sendEmail) {
      await instance.sendEmail();
    }

    // 이메일 전송 성공 후 처리: invoiceNumber 업데이트, CSV 파일 저장 등
    if (!invoiceData.value.invoiceModified)
      await incrementInvoiceNumber()

    await pushInvoice(invoiceData.value);

    // 이전 페이지로 이동 후 새로고침
    router.push('/invoice-generator').then(() => {
      window.location.reload();
    });
  } catch (error) {
    console.error("Failed to send email:", error);
  } finally {
    loading.value = false; // 로딩 종료
  }
};

defineExpose({
  generatePDF: instance && instance.generatePDF, // expose generatePDF if needed
  downloadPDF,
  sendEmail
});
</script>

<style scoped>
/* 공통 스타일 */
.item-container {
  padding: 10px 0;
}

.page {
  display: flex;
  flex-direction: column;
  height: 100vh;
}

.header {
  background-color: #f8f8f8;
  padding: 1rem;
}

.toolbar {
  display: flex;
  align-items: center;
  justify-content: center;
}

.content {
  flex: 1;
  padding: 1rem;
  overflow-y: auto;
}

/* 카드 스타일 */
.card {
  background: #fff;
  border-radius: 8px;
  margin-bottom: 1rem;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.card-content {
  padding: 1rem;
}

/* 버튼 스타일 */
.btn {
  display: block;
  width: 100%;
  padding: 1rem;
  margin-bottom: 1rem;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.btn-primary {
  background-color: #3880ff;
  color: #fff;
}

.btn-secondary {
  background-color: #5260ff;
  color: #fff;
}

/* 로딩 오버레이 스타일 */
.loading-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0,0,0,0.5);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  z-index: 9999;
}

.spinner {
  border: 4px solid rgba(0, 0, 0, 0.1);
  border-left-color: #fff;
  border-radius: 50%;
  width: 36px;
  height: 36px;
  animation: spin 1s linear infinite;
  margin-bottom: 1rem;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}
</style>

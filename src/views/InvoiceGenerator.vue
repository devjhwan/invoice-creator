<template>
  <div class="page">
    <div class="content">
      <div class="invoice-container">
        <h1>Invoice Generator</h1>

        <div class="invoice-header">
          <div class="input-row">
            <label>Invoice Number:</label>
            <input
              v-model="invoiceNumber"
              type="text"
              class="invoice-number"
              @input="markInvoiceNumberModified"
            />
          </div>
          <div class="input-row">
            <label>Invoice Date:</label>
            <input v-model="invoiceDate" type="date" class="invoice-date" />
          </div>
        </div>

        <div class="bill-button-container">
          <button class="add-bill-button" @click="toggleBillSection">Add Bill</button>
        </div>

        <div v-if="showBillSection" class="bill-section">
          <h2>Billing Information</h2>
          <div class="input-group">
            <label class="no-wrap">Company Name</label>
            <input
              v-model="billInfo.companyName"
              type="text"
              placeholder="Enter company name"
            />
          </div>
          <div class="input-group">
            <label class="no-wrap">VAT No.</label>
            <input v-model="billInfo.vatNo" type="text" placeholder="Enter VAT number" />
          </div>
          <div class="input-group">
            <label class="no-wrap">Street Address</label>
            <input v-model="billInfo.street" type="text" placeholder="Enter street address" />
          </div>
          <div class="input-group">
            <label class="no-wrap">City</label>
            <input v-model="billInfo.city" type="text" placeholder="Enter city" />
          </div>
          <div class="input-group">
            <label class="no-wrap">Postal Code</label>
            <input v-model="billInfo.postalCode" type="text" placeholder="Enter postal code" />
          </div>
          <div class="input-group">
            <label class="no-wrap">Country</label>
            <input v-model="billInfo.country" type="text" placeholder="Enter country" />
          </div>
          <div class="input-group">
            <label class="no-wrap">Email</label>
            <input v-model="billInfo.email" type="email" placeholder="Enter email address" />
          </div>
        </div>

        <div class="items-container">
          <div class="item" v-for="(item, index) in items" :key="index">
            <div class="input-group">
              <label class="no-wrap" v-if="item.expanded">Description</label>
              <input
                v-model="item.description"
                type="text"
                maxlength="100"
                placeholder="Description"
              />
            </div>
            <div class="input-group">
              <label class="no-wrap" v-if="item.expanded">Amount (€)</label>
              <input
                v-model.number="item.amount"
                type="number"
                min="0"
                step="0.01"
                placeholder="Amount"
                @input="updateValues(index)"
              />
            </div>

            <div v-if="item.expanded" class="expanded-fields">
              <div class="input-group">
                <label class="no-wrap">Tax (21%)</label>
                <input :value="item.tax.toFixed(2)" type="text" disabled />
              </div>
              <div class="input-group">
                <label class="no-wrap">Price (Excl. Tax)</label>
                <input :value="item.price.toFixed(2)" type="text" disabled />
              </div>
            </div>

            <div class="actions">
              <button @click="toggleExpand(index)">
                {{ item.expanded ? '⬆️ Collapse' : '⬇️ Expand' }}
              </button>
              <button class="remove-btn" @click="removeItem(index)">❌</button>
            </div>
          </div>
        </div>

        <div class="total-amount">
          <h3>Total Amount: €{{ totalAmount }}</h3>
        </div>

        <div class="buttons-container">
          <button class="add-button" @click="addItem">+ Add Item</button>
          <button class="reset-button" @click="resetPage">Reset</button>
          <button class="create-button" @click="navigateToInvoice">Create Invoice</button>
          <button class="download-button" @click="downloadCSV">Download CSV</button>
          <button class="edit-button" @click="navigateToEditCSV">Edit CSV</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { downloadCSVFile, getInvoiceNumber } from '@/utils/firebaseHelper.js';

// Vue Router 사용
const router = useRouter();

// 데이터 상태 정의
const invoiceNumber = ref(0);
const invoiceDate = ref(new Date().toISOString().split('T')[0]);
const invoiceModified = ref(false);
const showBillSection = ref(false);

const billInfo = ref({
  companyName: '',
  vatNo: '',
  street: '',
  city: '',
  postalCode: '',
  country: '',
  email: ''
});

onMounted(async () => {
  invoiceNumber.value = await getInvoiceNumber()
  console.log('페이지 로드됨');
});

// 데이터 수정 시 invoiceModified 변경
const markInvoiceNumberModified = () => {
  invoiceModified.value = true;
};

// Bill Section 토글
const toggleBillSection = () => {
  showBillSection.value = !showBillSection.value;
};

// 아이템 리스트
const items = ref([
  {
    description: '',
    amount: null, // null 허용
    tax: 0,
    price: 0,
    expanded: false
  }
]);

// 새 아이템 추가
const addItem = () => {
  items.value.push({ description: '', amount: null, tax: 0, price: 0, expanded: false });
};

// 아이템 제거
const removeItem = (index) => {
  items.value.splice(index, 1);
};

// 값 업데이트 (Tax & Price 계산)
const updateValues = (index) => {
  let amount = items.value[index].amount || 0;
  items.value[index].tax = Math.round(amount * 0.21 * 100) / 100;
  items.value[index].price = amount - items.value[index].tax;
};

// 아이템 확장/축소
const toggleExpand = (index) => {
  items.value[index].expanded = !items.value[index].expanded;
};

// 총 금액 계산
const totalAmount = computed(() => {
  return items.value.reduce((sum, item) => sum + (item.amount || 0), 0).toFixed(2);
});

const fillEmptyAmounts = () => {
  items.value.forEach((item) => {
    if (item.amount === null || item.amount === undefined || typeof item.amount === 'string') {
      item.amount = 0;
      updateValues(items.value.indexOf(item));
    }
  });
};

// Invoice 페이지 이동
const navigateToInvoice = () => {
  fillEmptyAmounts();
  const invoiceData = {
    invoiceNumber: invoiceNumber.value,
    invoiceDate: invoiceDate.value,
    invoiceModified: invoiceModified.value,
    showBillSection: showBillSection.value,
    billInfo: billInfo.value,
    items: items.value
  };
  sessionStorage.setItem('invoiceData', JSON.stringify(invoiceData));
  router.push({ name: 'InvoicePage' });
};

const downloadCSV = async () => {
  try {
    fillEmptyAmounts();
    await downloadCSVFile();
  } catch (error) {
    alert("CSV 파일 다운로드에 실패했습니다. 다시 시도해 주세요.");
  }
};

// edit-csv 페이지로 이동
const navigateToEditCSV = () => {
  router.push({ name: 'EditCSV' });
};


// 페이지 리셋 (새로고침)
const resetPage = () => {
  if (window.confirm('정말로 모든 입력 내용을 초기화하시겠습니까?')) {
    window.location.reload();
  }
};
</script>

<style scoped>
h1 {
  margin-bottom: 40px;
}

.invoice-container {
  max-width: 400px;
  margin: auto;
  text-align: center;
  padding: 20px;
}

.invoice-header {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
  gap: 10px;
}

@media (max-width: 400px) {
  .invoice-header {
    flex-direction: column;
    align-items: flex-start;
  }
}

.bill-button-container {
  display: flex;
  justify-content: flex-end;
}

.add-bill-button {
  margin-bottom: 15px;
  padding: 8px;
  background-color: #f0ad4e;
  border: none;
  cursor: pointer;
  border-radius: 4px;
}

.bill-section {
  border: 1px solid #ccc;
  padding: 10px;
  border-radius: 8px;
  background: #f9f9f9;
  margin-bottom: 15px;
}

textarea {
  width: 100%;
  padding: 6px;
  border: 1px solid #ccc;
  border-radius: 4px;
}

.input-row {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 14px;
}

label {
  width: 60px;
  text-align: left;
}

label.no-wrap {
  white-space: nowrap;
}

.invoice-number {
  width: 60px;
  max-width: 100%;
  padding: 6px;
}

.invoice-date {
  max-width: 100%;
  padding: 6px;
}

.items-container {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-bottom: 15px;
}

.item {
  border: 1px solid #ccc;
  padding: 10px;
  border-radius: 8px;
  background: #f9f9f9;
}

.input-group {
  display: flex;
  flex-direction: column;
  margin-bottom: 5px;
}

input {
  padding: 8px;
  font-size: 14px;
  border: 1px solid #ccc;
  border-radius: 4px;
}

input[disabled] {
  background-color: #e0e0e0;
  border: none;
}

.actions {
  display: flex;
  justify-content: space-between;
  margin-top: 5px;
}

.total-amount {
  text-align: center;
  font-size: 18px;
  font-weight: bold;
  margin-bottom: 15px;
}

.buttons-container {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
}

button {
  padding: 8px;
  cursor: pointer;
  border: none;
  font-size: 14px;
  border-radius: 4px;
}

.add-button {
  background-color: lightblue;
}

.create-button {
  background-color: lightgreen;
}

.reset-button {
  background-color: #ffcc00;
  color: black;
  width: 55px;
}

.remove-btn {
  background-color: #ffcccc;
}

/* 간단한 페이지 및 콘텐츠 레이아웃 */
.page {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.content {
  flex: 1;
  padding: 20px;
}
</style>

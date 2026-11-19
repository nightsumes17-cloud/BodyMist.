
/* ==========================================================================
   BODY SCENT — Shared Frontend Logic (product.html, order.html, admin.html)
   ========================================================================== */

const APPS_SCRIPT_URL =
  "https://script.google.com/macros/s/AKfycbw6dpch2RbFlCPosyiaxJ7XZ-12nrJHvFZRGh8ralil1vTa5jwKAtwlv5wDdqqHjoRhKQ/exec";

const PUBLISHED_CSV_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vSkzpP5p3T1qu6cH3zcBgDioO6ZiulGdyI3WL2Zqa0LYfjxgKVYItSWqKN9Ssb0BRH8YtYa2utHoKiB/pub?gid=0&single=true&output=csv";

document.addEventListener("DOMContentLoaded", () => {
  // 1. หน้าสินค้า (product.html)
  if (document.getElementById("product-list")) {
    initProductPage();
  }

  // 2. หน้าสั่งซื้อ (order.html)
  if (document.getElementById("orderForm")) {
    initOrderPage();
  }

  // 3. หน้าแอดมิน (admin.html)
  if (document.querySelector("#ordersTable tbody")) {
    initAdminPage();
  }
});

/* ==========================================================================
   1. PRODUCT PAGE (product.html)
   ========================================================================== */
async function initProductPage() {
  const filterBar = document.getElementById("filter-bar");
  const productList = document.getElementById("product-list");

  const moods = [
    { key: "all", label: "ทั้งหมด" },
    { key: "fresh", label: "Fresh" },
    { key: "sweet", label: "Sweet" },
    { key: "confident", label: "Confident" },
    { key: "romance", label: "Romance" }
  ];

  // อ่านค่า ?mood=xxx จาก URL parameter
  const params = new URLSearchParams(window.location.search);
  const initialMoodParam = (params.get("mood") || "all").toLowerCase();
  let activeMood = moods.some((m) => m.key === initialMoodParam)
    ? initialMoodParam
    : "all";

  let allProducts = [];

  // สร้างปุ่มกรองตาม mood ใน #filter-bar
  function renderFilterButtons() {
    if (!filterBar) return;
    filterBar.innerHTML = moods
      .map((m) => {
        const isActive = m.key === activeMood ? " is-active" : "";
        const dotHtml =
          m.key !== "all"
            ? `<span class="mood-dot mood-dot--${m.key}"></span>`
            : "";
        return `
          <button type="button" class="filter-btn${isActive}" data-mood="${m.key}">
            ${dotHtml}
            <span>${m.label}</span>
          </button>
        `;
      })
      .join("");

    filterBar.querySelectorAll(".filter-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        activeMood = btn.dataset.mood;
        renderFilterButtons();
        renderProducts();
      });
    });
  }

  // แสดงการ์ดสินค้าใน #product-list
  function renderProducts() {
    const filtered =
      activeMood === "all"
        ? allProducts
        : allProducts.filter(
            (item) => (item.mood || "").toLowerCase() === activeMood
          );

    if (filtered.length === 0) {
      productList.innerHTML = `<p class="muted-text">ไม่พบสินค้าในหมวดหมู่นี้</p>`;
      return;
    }

    productList.innerHTML = filtered
      .map((product) => {
        const moodKey = (product.mood || "").toLowerCase();
        const moodLabel =
          moodKey.charAt(0).toUpperCase() + moodKey.slice(1);
        const orderUrl = `order.html?item=${encodeURIComponent(
          product.name
        )}&price=${encodeURIComponent(product.price)}`;

        return `
          <article class="card" data-mood="${escapeHtml(moodKey)}">
            <div class="product-card__media">
              <img src="${escapeHtml(product.image)}" alt="${escapeHtml(
          product.name
        )}" loading="lazy" />
            </div>
            <div class="product-card__meta">
              <span class="mood-tag">
                <span class="mood-dot mood-dot--${escapeHtml(moodKey)}"></span>
                ${escapeHtml(moodLabel)}
              </span>
              <span>${escapeHtml(product.size)}</span>
            </div>
            <h3>${escapeHtml(product.name)}</h3>
            <p class="muted-text">${escapeHtml(product.description || "")}</p>
            <div class="product-card__price">
              <span>${Number(product.price).toLocaleString()} บาท</span>
              <a href="${orderUrl}" class="btn btn--sm">สั่งซื้อ</a>
            </div>
          </article>
        `;
      })
      .join("");
  }

  renderFilterButtons();

  try {
    const response = await fetch("products.json");
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    allProducts = await response.json();
    renderProducts();
  } catch (error) {
    console.error("โหลดข้อมูลสินค้าไม่สำเร็จ:", error);
    productList.innerHTML = `<p class="muted-text">ไม่สามารถโหลดรายการสินค้าได้ในขณะนี้ กรุณาลองใหม่อีกครั้ง</p>`;
  }
}

/* ==========================================================================
   2. ORDER PAGE (order.html)
   ========================================================================== */
function initOrderPage() {
  const orderForm = document.getElementById("orderForm");
  const itemsInput = document.getElementById("items");
  const totalInput = document.getElementById("total");

  // อ่านค่า item และ price จาก URL parameter แล้วเติมลงฟอร์มทันที
  const params = new URLSearchParams(window.location.search);
  const itemParam = params.get("item");
  const priceParam = params.get("price");

  if (itemParam !== null && itemsInput) {
    itemsInput.value = itemParam;
  }

  if (priceParam !== null && totalInput) {
    totalInput.value = priceParam;
  }

  orderForm.addEventListener("submit", (event) => {
    event.preventDefault();

    const submitBtn = orderForm.querySelector('button[type="submit"]');
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = "กำลังส่งคำสั่งซื้อ...";
    }

    const payload = {
      customerName: document.getElementById("customerName").value.trim(),
      contact: document.getElementById("contact").value.trim(),
      items: document.getElementById("items").value.trim(),
      total: document.getElementById("total").value.trim(),
      note: document.getElementById("note").value.trim()
    };

    // ส่งข้อมูลแบบ POST JSON string ธรรมดา (ไม่ตั้ง headers และไม่ใช้ mode: 'no-cors')
    fetch(APPS_SCRIPT_URL, {
      method: "POST",
      body: JSON.stringify(payload)
    })
      .then(() => {
        window.location.href = "thankyou.html";
      })
      .catch((error) => {
        console.error(error);
        alert("เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง");
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = "ยืนยันสั่งซื้อ";
        }
      });
  });
}

/* ==========================================================================
   3. ADMIN PAGE (admin.html)
   ========================================================================== */
async function initAdminPage() {
  const tbody = document.querySelector("#ordersTable tbody");
  tbody.innerHTML = `<tr><td colspan="6">กำลังโหลดข้อมูลคำสั่งซื้อ...</td></tr>`;

  try {
    // ต่อ query ป้องกัน browser cache เพื่อให้ได้ข้อมูลล่าสุดเสมอ
    const separator = PUBLISHED_CSV_URL.includes("?") ? "&" : "?";
    const response = await fetch(`${PUBLISHED_CSV_URL}${separator}_t=${Date.now()}`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const csvText = await response.text();
    const rows = parseCSV(csvText);

    // ตัดแถวว่างและข้ามแถวหัวตาราง (แถวแรก)
    const dataRows = rows
      .slice(1)
      .filter((row) => row.some((cell) => cell.trim() !== ""));

    if (dataRows.length === 0) {
      tbody.innerHTML = `<tr><td colspan="6">ยังไม่มีรายการคำสั่งซื้อ</td></tr>`;
      return;
    }

    // เรียงจากรายการล่าสุดขึ้นก่อน (ข้อมูลใหม่ถูก append ต่อท้ายใน Sheet)
    const latestFirstRows = dataRows.reverse();

    tbody.innerHTML = latestFirstRows
      .map((row) => {
        const timestamp = formatThaiDateTime(row[0] || "");
        const customerName = row[1] || "-";
        const contact = row[2] || "-";
        const items = row[3] || "-";
        const totalRaw = (row[4] || "").trim();
        const totalDisplay =
          totalRaw !== "" && !isNaN(Number(totalRaw))
            ? `${Number(totalRaw).toLocaleString()} บาท`
            : totalRaw || "-";
        const note = row[5] || "-";

        return `
          <tr>
            <td>${escapeHtml(timestamp)}</td>
            <td>${escapeHtml(customerName)}</td>
            <td>${escapeHtml(contact)}</td>
            <td>${escapeHtml(items)}</td>
            <td>${escapeHtml(totalDisplay)}</td>
            <td>${escapeHtml(note)}</td>
          </tr>
        `;
      })
      .join("");
  } catch (error) {
    console.error("โหลดข้อมูลคำสั่งซื้อไม่สำเร็จ:", error);
    tbody.innerHTML = `<tr><td colspan="6">เกิดข้อผิดพลาดในการโหลดข้อมูลคำสั่งซื้อ</td></tr>`;
  }
}

/* ==========================================================================
   CSV PARSER (Custom RFC-4180 Compliant Parser — No External Libraries)
   รองรับค่าที่มีเครื่องหมายจุลภาค (,) หรือขึ้นบรรทัดใหม่ภายในเครื่องหมายคำพูด ("...")
   ========================================================================== */
function parseCSV(text) {
  const rows = [];
  let currentRow = [];
  let currentField = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1];

    if (inQuotes) {
      if (char === '"' && nextChar === '"') {
        currentField += '"';
        i++; // ข้ามเครื่องหมายคำพูดซ้อน ("")
      } else if (char === '"') {
        inQuotes = false;
      } else {
        currentField += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === ",") {
        currentRow.push(currentField);
        currentField = "";
      } else if (char === "\r" && nextChar === "\n") {
        currentRow.push(currentField);
        rows.push(currentRow);
        currentRow = [];
        currentField = "";
        i++; // ข้าม \n หลัง \r
      } else if (char === "\n" || char === "\r") {
        currentRow.push(currentField);
        rows.push(currentRow);
        currentRow = [];
        currentField = "";
      } else {
        currentField += char;
      }
    }
  }

  // เก็บฟิลด์และแถวสุดท้าย (กรณีไฟล์ไม่ได้ลงท้ายด้วยขึ้นบรรทัดใหม่)
  if (currentField !== "" || currentRow.length > 0) {
    currentRow.push(currentField);
    rows.push(currentRow);
  }

  return rows;
}

/* ==========================================================================
   HELPERS
   ========================================================================== */
function formatThaiDateTime(value) {
  const trimmed = value.trim();
  if (!trimmed) return "-";
  const parsed = new Date(trimmed);
  if (isNaN(parsed.getTime())) {
    return trimmed;
  }
  return parsed.toLocaleString("th-TH", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

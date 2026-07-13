/* ============================================
   Gaming Castel - Main JavaScript
   ============================================ */

let products = [];
let currentPage = 1;
let productsPerPage = 12;
let filteredProducts = [];

/* ============================================
   Utility Functions
   ============================================ */
function getFromStorage(key, defaultValue = null) {
  try {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : defaultValue;
  } catch {
    return defaultValue;
  }
}

function setToStorage(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function formatPrice(price) {
  return price.toLocaleString('en-US', { style: 'currency', currency: 'MAD', minimumFractionDigits: 0 }).replace('MAD', '') + ' DH';
}

function getStarsHtml(rating) {
  let stars = '';
  for (let i = 1; i <= 5; i++) {
    if (i <= Math.floor(rating)) {
      stars += '<span class="material-symbols-outlined" style="font-size:16px">star</span>';
    } else if (i - rating < 1) {
      stars += '<span class="material-symbols-outlined" style="font-size:16px">star_half</span>';
    } else {
      stars += '<span class="material-symbols-outlined" style="font-size:16px">star_outline</span>';
    }
  }
  return stars;
}

/* ============================================
   Toast Notifications
   ============================================ */
function showToast(message, type = 'success') {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const icons = { success: 'check_circle', error: 'error', info: 'info' };
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `
    <span class="material-symbols-outlined">${icons[type] || 'info'}</span>
    <span>${message}</span>
  `;
  container.appendChild(toast);
  setTimeout(() => { if (toast.parentNode) toast.remove(); }, 3500);
}

/* ============================================
   Cart Functions
   ============================================ */
function getCart() {
  return getFromStorage('gc_cart', []);
}

function saveCart(cart) {
  setToStorage('gc_cart', cart);
  updateCartCount();
}

function addToCart(product, quantity = 1) {
  let cart = getCart();
  const existing = cart.find(item => item.id === product.id);
  if (existing) {
    existing.quantity += quantity;
  } else {
    cart.push({ ...product, quantity });
  }
  saveCart(cart);
  showToast(`${product.name} added to cart`, 'success');
}

function removeFromCart(productId) {
  let cart = getCart();
  cart = cart.filter(item => item.id !== productId);
  saveCart(cart);
  renderCart();
  showToast('Item removed from cart', 'info');
}

function updateCartQuantity(productId, quantity) {
  let cart = getCart();
  const item = cart.find(i => i.id === productId);
  if (item) {
    item.quantity = quantity;
    if (item.quantity <= 0) {
      cart = cart.filter(i => i.id !== productId);
    }
  }
  saveCart(cart);
  renderCart();
}

function getCartTotal() {
  return getCart().reduce((sum, item) => sum + item.price * item.quantity, 0);
}

function updateCartCount() {
  document.querySelectorAll('.cart-count').forEach(el => {
    const count = getCart().reduce((s, i) => s + i.quantity, 0);
    el.textContent = count;
    el.style.display = count > 0 ? 'flex' : 'none';
  });
}

/* ============================================
   Wishlist Functions
   ============================================ */
function getWishlist() {
  return getFromStorage('gc_wishlist', []);
}

function saveWishlist(wishlist) {
  setToStorage('gc_wishlist', wishlist);
  updateWishlistCount();
}

function toggleWishlist(productId) {
  let wishlist = getWishlist();
  const index = wishlist.indexOf(productId);
  if (index > -1) {
    wishlist.splice(index, 1);
    showToast('Removed from wishlist', 'info');
  } else {
    wishlist.push(productId);
    showToast('Added to wishlist', 'success');
  }
  saveWishlist(wishlist);
  updateWishlistButtons();
  return index === -1;
}

function isInWishlist(productId) {
  return getWishlist().includes(productId);
}

function updateWishlistCount() {
  document.querySelectorAll('.wishlist-count').forEach(el => {
    const count = getWishlist().length;
    el.textContent = count;
    el.style.display = count > 0 ? 'flex' : 'none';
  });
}

function updateWishlistButtons() {
  document.querySelectorAll('.wishlist-btn').forEach(btn => {
    const id = parseInt(btn.dataset.id);
    if (isInWishlist(id)) {
      btn.classList.add('active');
      btn.innerHTML = '<span class="material-symbols-outlined">favorite</span>';
    } else {
      btn.classList.remove('active');
      btn.innerHTML = '<span class="material-symbols-outlined">favorite_outline</span>';
    }
  });
}

/* ============================================
   Load Products
   ============================================ */
async function loadProducts() {
  try {
    const root = window.location.pathname.includes('/pages') ? '../assets/data/products.json' : 'assets/data/products.json';
    const res = await fetch(root);
    products = await res.json();
    filteredProducts = [...products];
    return products;
  } catch (err) {
    console.error('Failed to load products:', err);
    return [];
  }
}

/* ============================================
   Render Product Cards
   ============================================ */
function renderProductCards(productsToRender, containerId = 'product-grid') {
  const container = document.getElementById(containerId);
  if (!container) return;

  if (!productsToRender.length) {
    container.innerHTML = `
      <div class="empty-state" style="grid-column:1/-1">
        <div class="icon"><span class="material-symbols-outlined" style="font-size:80px">search_off</span></div>
        <h2>No products found</h2>
        <p>Try adjusting your search or filter criteria</p>
      </div>`;
    return;
  }

  container.innerHTML = productsToRender.map(product => {
    const hasDiscount = product.oldPrice && product.oldPrice > product.price;
    const discountPercent = hasDiscount ? Math.round((1 - product.price / product.oldPrice) * 100) : 0;

    return `
      <div class="product-card" data-id="${product.id}">
        <div class="product-image">
          ${hasDiscount ? `<span class="product-badge discount">-${discountPercent}%</span>` : '<span class="product-badge new">New</span>'}
          <img src="${product.images[0]}" alt="${product.name}" loading="lazy">
          <div class="product-actions">
            <button class="wishlist-btn" data-id="${product.id}" onclick="toggleWishlist(${product.id}); updateWishlistButtons();">
              <span class="material-symbols-outlined">${isInWishlist(product.id) ? 'favorite' : 'favorite_outline'}</span>
            </button>
            <button onclick="quickView(${product.id})">
              <span class="material-symbols-outlined">visibility</span>
            </button>
          </div>
        </div>
        <div class="product-info">
          <p class="product-category">${product.category}</p>
          <a href="product.html?id=${product.id}"><h3 class="product-name">${product.name}</h3></a>
          <div class="product-rating">
            <div class="stars">${getStarsHtml(product.rating)}</div>
            <span>(${product.reviews})</span>
          </div>
          <div class="product-price">
            <span class="current">${formatPrice(product.price)}</span>
            ${hasDiscount ? `<span class="old">${formatPrice(product.oldPrice)}</span>` : ''}
          </div>
        </div>
        <button class="add-to-cart-btn" onclick="addToCart({id:${product.id}, name:'${product.name.replace(/'/g, "\\'")}', price:${product.price}, image:'${product.images[0]}'})">
          <span class="material-symbols-outlined" style="font-size:18px">shopping_bag</span> Add to Cart
        </button>
      </div>`;
  }).join('');
}

/* ============================================
   Quick View Modal
   ============================================ */
function quickView(productId) {
  const product = products.find(p => p.id === productId);
  if (!product) return;

  const modal = document.getElementById('quick-view-modal');
  if (!modal) return;

  const hasDiscount = product.oldPrice && product.oldPrice > product.price;

  modal.innerHTML = `
    <div class="modal-overlay" onclick="closeQuickView()">
      <div class="modal-content" onclick="event.stopPropagation()">
        <button class="modal-close" onclick="closeQuickView()">
          <span class="material-symbols-outlined">close</span>
        </button>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:30px">
          <div>
            <img src="${product.images[0]}" alt="${product.name}" style="width:100%;border-radius:12px">
          </div>
          <div>
            <p style="color:var(--text-muted);font-size:0.8rem;text-transform:uppercase;letter-spacing:1px;margin-bottom:8px">${product.category}</p>
            <h2 style="font-size:1.5rem;font-weight:700;margin-bottom:12px">${product.name}</h2>
            <div class="product-rating" style="margin-bottom:15px">
              <div class="stars">${getStarsHtml(product.rating)}</div>
              <span>(${product.reviews} reviews)</span>
            </div>
            <div class="product-price" style="margin-bottom:20px">
              <span class="current" style="font-size:1.8rem">${formatPrice(product.price)}</span>
              ${hasDiscount ? `<span class="old" style="font-size:1.1rem">${formatPrice(product.oldPrice)}</span>` : ''}
            </div>
            <p style="color:var(--text-secondary);line-height:1.7;margin-bottom:20px">${product.description}</p>
            <div style="display:flex;gap:12px;flex-wrap:wrap">
              <button class="btn btn-primary" onclick="addToCart({id:${product.id}, name:'${product.name.replace(/'/g, "\\'")}', price:${product.price}, image:'${product.images[0]}'}); closeQuickView();">
                <span class="material-symbols-outlined">shopping_bag</span> Add to Cart
              </button>
              <a href="product.html?id=${product.id}" class="btn btn-secondary">
                <span class="material-symbols-outlined">open_in_new</span> Full Details
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>`;

  modal.classList.add('active');
  document.body.style.overflow = 'hidden';

  gsap.from('.modal-content', { opacity: 0, scale: 0.9, duration: 0.3, ease: 'power3.out' });
}

function closeQuickView() {
  const modal = document.getElementById('quick-view-modal');
  if (modal) {
    modal.classList.remove('active');
    modal.innerHTML = '';
    document.body.style.overflow = '';
  }
}

/* ============================================
   Shop Filtering & Sorting
   ============================================ */
function filterProducts() {
  let result = [...products];

  const searchTerm = document.getElementById('shop-search')?.value?.toLowerCase() || '';
  const selectedCategories = [...document.querySelectorAll('.category-filter:checked')].map(cb => cb.value);
  const selectedBrands = [...document.querySelectorAll('.brand-filter:checked')].map(cb => cb.value);
  const maxPrice = parseInt(document.getElementById('price-max')?.value) || 20000;
  const sortBy = document.getElementById('sort-by')?.value || 'default';

  if (searchTerm) {
    result = result.filter(p => p.name.toLowerCase().includes(searchTerm) || p.category.toLowerCase().includes(searchTerm) || p.brand.toLowerCase().includes(searchTerm));
  }
  if (selectedCategories.length) {
    result = result.filter(p => selectedCategories.includes(p.category));
  }
  if (selectedBrands.length) {
    result = result.filter(p => selectedBrands.includes(p.brand));
  }
  result = result.filter(p => p.price <= maxPrice);

  switch (sortBy) {
    case 'price-asc': result.sort((a, b) => a.price - b.price); break;
    case 'price-desc': result.sort((a, b) => b.price - a.price); break;
    case 'rating': result.sort((a, b) => b.rating - a.rating); break;
    case 'name': result.sort((a, b) => a.name.localeCompare(b.name)); break;
    case 'newest': break;
    default: break;
  }

  filteredProducts = result;
  const total = result.length;
  document.getElementById('results-count') && (document.getElementById('results-count').textContent = total);
  currentPage = 1;
  renderShopPage(result);
}

function renderShopPage(productsToRender) {
  const start = (currentPage - 1) * productsPerPage;
  const end = start + productsPerPage;
  const pageProducts = productsToRender.slice(start, end);
  renderProductCards(pageProducts, 'shop-grid');
  renderPagination(productsToRender.length);
}

function renderPagination(total) {
  const container = document.getElementById('pagination');
  if (!container) return;

  const totalPages = Math.ceil(total / productsPerPage);
  if (totalPages <= 1) { container.innerHTML = ''; return; }

  let html = `<button onclick="changePage(${currentPage - 1})" ${currentPage === 1 ? 'disabled style="opacity:0.4;cursor:not-allowed"' : ''}>
    <span class="material-symbols-outlined">chevron_left</span>
  </button>`;

  for (let i = 1; i <= totalPages; i++) {
    html += `<button class="${i === currentPage ? 'active' : ''}" onclick="changePage(${i})">${i}</button>`;
  }

  html += `<button onclick="changePage(${currentPage + 1})" ${currentPage === totalPages ? 'disabled style="opacity:0.4;cursor:not-allowed"' : ''}>
    <span class="material-symbols-outlined">chevron_right</span>
  </button>`;

  container.innerHTML = html;
}

function changePage(page) {
  currentPage = page;
  renderShopPage(filteredProducts);
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

/* ============================================
   Render Cart Page
   ============================================ */
function renderCart() {
  const container = document.getElementById('cart-items');
  const summaryContainer = document.getElementById('cart-summary');
  const cart = getCart();
  updateCartCount();

  if (!container && !summaryContainer) return;

  if (container) {
    if (!cart.length) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="icon"><span class="material-symbols-outlined" style="font-size:80px">shopping_cart</span></div>
          <h2>Your cart is empty</h2>
          <p>Looks like you haven't added anything to your cart yet</p>
          <a href="shop.html" class="btn btn-primary"><span class="material-symbols-outlined">store</span> Continue Shopping</a>
        </div>`;
      if (summaryContainer) summaryContainer.innerHTML = '';
      return;
    }

    container.innerHTML = `
      <table class="cart-table">
        <thead>
          <tr>
            <th>Product</th>
            <th>Price</th>
            <th>Quantity</th>
            <th>Subtotal</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          ${cart.map(item => `
            <tr>
              <td>
                <div class="cart-item">
                  <div class="cart-item-image">
                    <img src="${item.image}" alt="${item.name}" loading="lazy">
                  </div>
                  <div class="cart-item-info">
                    <h4>${item.name}</h4>
                    <p>${item.category || ''}</p>
                  </div>
                </div>
              </td>
              <td>${formatPrice(item.price)}</td>
              <td>
                <div class="quantity-selector" style="display:inline-flex">
                  <button onclick="updateCartQuantity(${item.id}, ${item.quantity - 1})">-</button>
                  <input type="text" value="${item.quantity}" readonly>
                  <button onclick="updateCartQuantity(${item.id}, ${item.quantity + 1})">+</button>
                </div>
              </td>
              <td style="font-weight:600">${formatPrice(item.price * item.quantity)}</td>
              <td>
                <button class="remove-item" onclick="removeFromCart(${item.id})">
                  <span class="material-symbols-outlined">delete</span>
                </button>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>`;
  }

  if (summaryContainer) {
    const subtotal = getCartTotal();
    const shipping = subtotal >= 999 ? 0 : 99;
    const tax = Math.round(subtotal * 0.1);
    const total = subtotal + shipping + tax;

    summaryContainer.innerHTML = `
      <div class="cart-summary">
        <h3>Order Summary</h3>
        <div class="summary-row">
          <span>Subtotal</span>
          <span>${formatPrice(subtotal)}</span>
        </div>
        <div class="summary-row">
          <span>Shipping</span>
          <span>${shipping === 0 ? 'Free' : formatPrice(shipping)}</span>
        </div>
        <div class="summary-row">
          <span>Tax (10%)</span>
          <span>${formatPrice(tax)}</span>
        </div>
        <div class="coupon">
          <input type="text" placeholder="Coupon code" id="coupon-input">
          <button class="btn btn-secondary btn-sm" onclick="applyCoupon()">Apply</button>
        </div>
        <div class="summary-row total">
          <span>Total</span>
          <span>${formatPrice(total)}</span>
        </div>
        <a href="checkout.html" class="btn btn-primary" style="width:100%;justify-content:center;margin-top:20px">
          <span class="material-symbols-outlined">lock</span> Proceed to Checkout
        </a>
        <a href="shop.html" style="display:block;text-align:center;margin-top:15px;color:var(--text-muted);font-size:0.9rem">
          Continue Shopping
        </a>
      </div>`;
  }
}

function applyCoupon() {
  const input = document.getElementById('coupon-input');
  if (input && input.value.trim()) {
    showToast('Coupon applied! 10% discount added', 'success');
    input.value = '';
  } else {
    showToast('Please enter a coupon code', 'error');
  }
}

/* ============================================
   Render Wishlist Page
   ============================================ */
function renderWishlistPage() {
  const container = document.getElementById('wishlist-items');
  if (!container) return;

  const wishlistIds = getWishlist();
  const wishlistProducts = products.filter(p => wishlistIds.includes(p.id));

  if (!wishlistProducts.length) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="icon"><span class="material-symbols-outlined" style="font-size:80px">favorite</span></div>
        <h2>Your wishlist is empty</h2>
        <p>Save your favorite products and come back to them later</p>
        <a href="shop.html" class="btn btn-primary"><span class="material-symbols-outlined">store</span> Browse Products</a>
      </div>`;
    return;
  }

  container.innerHTML = `
    <div class="product-grid" style="grid-template-columns:repeat(3,1fr)">
      ${wishlistProducts.map(product => {
        const hasDiscount = product.oldPrice && product.oldPrice > product.price;
        return `
          <div class="product-card">
            <div class="product-image">
              ${hasDiscount ? `<span class="product-badge discount">-${Math.round((1 - product.price / product.oldPrice) * 100)}%</span>` : ''}
              <img src="${product.images[0]}" alt="${product.name}" loading="lazy">
              <div class="product-actions">
                <button class="wishlist-btn active" onclick="toggleWishlist(${product.id}); renderWishlistPage();">
                  <span class="material-symbols-outlined">favorite</span>
                </button>
              </div>
            </div>
            <div class="product-info">
              <p class="product-category">${product.category}</p>
              <a href="product.html?id=${product.id}"><h3 class="product-name">${product.name}</h3></a>
              <div class="product-price">
                <span class="current">${formatPrice(product.price)}</span>
                ${hasDiscount ? `<span class="old">${formatPrice(product.oldPrice)}</span>` : ''}
              </div>
            </div>
            <button class="add-to-cart-btn" style="opacity:1;transform:none;position:static;margin:0 20px 20px;width:auto" onclick="addToCart({id:${product.id}, name:'${product.name.replace(/'/g, "\\'")}', price:${product.price}, image:'${product.images[0]}'})">
              <span class="material-symbols-outlined" style="font-size:18px">shopping_bag</span> Add to Cart
            </button>
          </div>`;
      }).join('')}
    </div>`;
}

/* ============================================
   Render Product Detail Page
   ============================================ */
function renderProductPage(productId) {
  const product = products.find(p => p.id === parseInt(productId));
  if (!product) {
    const container = document.getElementById('product-detail');
    if (container) container.innerHTML = '<div class="empty-state"><h2>Product not found</h2><a href="shop.html" class="btn btn-primary">Back to Shop</a></div>';
    return;
  }

  document.title = `${product.name} - Gaming Castel`;
  const hasDiscount = product.oldPrice && product.oldPrice > product.price;

  const container = document.getElementById('product-detail');
  if (!container) return;

  container.innerHTML = `
    <div class="product-page-layout">
      <div class="product-gallery">
        <div class="product-main-image" id="main-image">
          <img src="${product.images[0]}" alt="${product.name}" id="main-img">
        </div>
        <div class="product-thumbnails">
          ${product.images.map((img, i) => `
            <div class="product-thumbnail ${i === 0 ? 'active' : ''}" onclick="changeImage(this, '${img}')">
              <img src="${img}" alt="${product.name}">
            </div>
          `).join('')}
        </div>
      </div>
      <div class="product-details">
        <p class="product-category">${product.brand} / ${product.category}</p>
        <h1 class="product-name" style="display:block;-webkit-line-clamp:unset">${product.name}</h1>
        <div class="product-rating">
          <div class="stars">${getStarsHtml(product.rating)}</div>
          <span>${product.rating} (${product.reviews} reviews)</span>
        </div>
        <div class="product-price">
          <span class="current">${formatPrice(product.price)}</span>
          ${hasDiscount ? `<span class="old">${formatPrice(product.oldPrice)}</span><span class="product-badge discount" style="position:static;display:inline-block">-${Math.round((1 - product.price / product.oldPrice) * 100)}%</span>` : ''}
        </div>
        <div class="product-meta">
          <div class="product-meta-item">
            <span class="material-symbols-outlined">${product.stock > 0 ? 'check_circle' : 'cancel'}</span>
            <span class="stock ${product.stock > 0 ? '' : 'out'}">${product.stock > 0 ? 'In Stock' : 'Out of Stock'}</span>
          </div>
          <div class="product-meta-item">
            <span class="material-symbols-outlined">verified</span>
            <span>1 Year Warranty</span>
          </div>
          <div class="product-meta-item">
            <span class="material-symbols-outlined">local_shipping</span>
            <span>Free Shipping</span>
          </div>
        </div>
        ${product.colors ? `
        <div class="product-colors">
          <h4>Color:</h4>
          <div class="color-options">
            ${product.colors.map(color => {
              const colorMap = { Black: '#1a1a1a', White: '#f0f0f0', Mercury: '#8c8c8c', 'Black/Red': '#1a1a1a', 'Black/Blue': '#1a1a1a', 'White/Pink': '#f0f0f0', Crimson: '#dc143c', Gunmetal: '#2a2a35', 'Black/White': '#1a1a1a', Cobalt: '#0047ab', RGB: 'linear-gradient(135deg, red, green, blue)', Gray: '#808080', Magenta: '#ff00ff' };
              return `<div class="color-option" style="background:${colorMap[color] || '#333'}" title="${color}"></div>`;
            }).join('')}
          </div>
        </div>` : ''}
        <div class="product-quantity">
          <h4>Quantity:</h4>
          <div class="quantity-selector">
            <button onclick="changeQty(-1)">-</button>
            <input type="text" value="1" id="qty-input" readonly>
            <button onclick="changeQty(1)">+</button>
          </div>
        </div>
        <div class="product-buttons">
          <button class="btn btn-primary btn-lg" onclick="addToCart({id:${product.id}, name:'${product.name.replace(/'/g, "\\'")}', price:${product.price}, image:'${product.images[0]}'}, parseInt(document.getElementById('qty-input').value))">
            <span class="material-symbols-outlined">shopping_bag</span> Add to Cart
          </button>
          <button class="btn btn-accent btn-lg">
            <span class="material-symbols-outlined">bolt</span> Buy Now
          </button>
          <button class="btn btn-secondary btn-lg wishlist-btn ${isInWishlist(product.id) ? 'active' : ''}" data-id="${product.id}" onclick="toggleWishlist(${product.id}); updateWishlistButtons();">
            <span class="material-symbols-outlined">${isInWishlist(product.id) ? 'favorite' : 'favorite_outline'}</span>
          </button>
        </div>
        <div style="display:flex;gap:15px;color:var(--text-muted);font-size:0.9rem">
          <span style="display:flex;align-items:center;gap:5px"><span class="material-symbols-outlined" style="font-size:18px">share</span> Share</span>
          <span style="display:flex;align-items:center;gap:5px"><span class="material-symbols-outlined" style="font-size:18px">compare_arrows</span> Compare</span>
        </div>
      </div>
    </div>
    <div class="product-tabs">
      <div class="tabs-header">
        <button class="tab-btn active" onclick="switchTab(this, 'description')">Description</button>
        <button class="tab-btn" onclick="switchTab(this, 'specifications')">Specifications</button>
        <button class="tab-btn" onclick="switchTab(this, 'reviews')">Reviews (${product.reviews})</button>
      </div>
      <div class="tab-content active" id="tab-description">
        <p>${product.description}</p>
        <h4 style="margin:30px 0 15px;font-size:1.1rem;font-weight:600">Key Features</h4>
        <ul class="features-list">
          ${product.features.map(f => `
            <li><span class="material-symbols-outlined">check_circle</span> ${f}</li>
          `).join('')}
        </ul>
      </div>
      <div class="tab-content" id="tab-specifications">
        <table class="specs-table">
          ${product.specifications.map(spec => {
            const [key, ...val] = spec.split(':');
            return `<tr><td>${key.trim()}</td><td>${val.join(':').trim()}</td></tr>`;
          }).join('')}
        </table>
      </div>
      <div class="tab-content" id="tab-reviews">
        ${[1,2,3].map(i => `
          <div class="review-card">
            <div class="review-header">
              <div class="review-author">
                <div class="review-avatar">${['JD','MK','AL'][i-1]}</div>
                <div>
                  <strong>${['John Doe','Mike Kim','Alex Lee'][i-1]}</strong>
                  <div class="stars" style="margin-top:4px">${getStarsHtml(4.5)}</div>
                </div>
              </div>
              <span class="review-date">${['2 weeks ago','1 month ago','3 weeks ago'][i-1]}</span>
            </div>
            <p class="review-text">${['Amazing product! The build quality is outstanding and performance exceeds expectations. Highly recommended for competitive gaming.','Great value for money. Shipping was fast and packaging was secure. Will definitely buy again from Gaming Castel.','Excellent quality and comfort. The RGB lighting looks stunning and the software is intuitive to use.'][i-1]}</p>
          </div>
        `).join('')}
      </div>
    </div>`;
}

function changeImage(thumb, src) {
  document.querySelectorAll('.product-thumbnail').forEach(t => t.classList.remove('active'));
  thumb.classList.add('active');
  document.getElementById('main-img').src = src;
}

function changeQty(delta) {
  const input = document.getElementById('qty-input');
  if (!input) return;
  let val = parseInt(input.value) + delta;
  if (val < 1) val = 1;
  if (val > 99) val = 99;
  input.value = val;
}

function switchTab(btn, tabId) {
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
  btn.classList.add('active');
  document.getElementById(`tab-${tabId}`).classList.add('active');
}

/* ============================================
   Render Related Products
   ============================================ */
function renderRelatedProducts(category, excludeId) {
  const container = document.getElementById('related-products');
  if (!container) return;

  const related = products.filter(p => p.category === category && p.id !== excludeId).slice(0, 4);
  if (!related.length) {
    container.innerHTML = '<p style="color:var(--text-muted)">No related products found.</p>';
    return;
  }

  container.innerHTML = `<div class="product-grid">${related.map(p => {
    const hasDiscount = p.oldPrice && p.oldPrice > p.price;
    return `
      <div class="product-card">
        <div class="product-image">
          ${hasDiscount ? `<span class="product-badge discount">-${Math.round((1 - p.price / p.oldPrice) * 100)}%</span>` : ''}
          <img src="${p.images[0]}" alt="${p.name}" loading="lazy">
        </div>
        <div class="product-info">
          <p class="product-category">${p.category}</p>
          <a href="product.html?id=${p.id}"><h3 class="product-name">${p.name}</h3></a>
          <div class="product-rating">
            <div class="stars">${getStarsHtml(p.rating)}</div>
            <span>(${p.reviews})</span>
          </div>
          <div class="product-price">
            <span class="current">${formatPrice(p.price)}</span>
            ${hasDiscount ? `<span class="old">${formatPrice(p.oldPrice)}</span>` : ''}
          </div>
        </div>
      </div>`;
  }).join('')}</div>`;
}

/* ============================================
   Checkout Page
   ============================================ */
function renderCheckoutSummary() {
  const container = document.getElementById('checkout-summary');
  if (!container) return;

  const cart = getCart();
  if (!cart.length) {
    container.innerHTML = '<p style="color:var(--text-muted)">Your cart is empty. <a href="shop.html" style="color:var(--primary)">Shop now</a></p>';
    return;
  }

  const subtotal = getCartTotal();
  const shipping = subtotal >= 999 ? 0 : 99;
  const tax = Math.round(subtotal * 0.1);
  const total = subtotal + shipping + tax;

  container.innerHTML = `
    <div class="cart-summary">
      <h3>Order Summary</h3>
      <div class="order-summary-items">
        ${cart.map(item => `
          <div class="order-item">
            <div class="order-item-image">
              <img src="${item.image}" alt="${item.name}" loading="lazy">
            </div>
            <div class="order-item-info">
              <h4>${item.name}</h4>
              <p>Qty: ${item.quantity}</p>
            </div>
            <div class="order-item-price">${formatPrice(item.price * item.quantity)}</div>
          </div>
        `).join('')}
      </div>
      <div class="summary-row"><span>Subtotal</span><span>${formatPrice(subtotal)}</span></div>
      <div class="summary-row"><span>Shipping</span><span>${shipping === 0 ? 'Free' : formatPrice(shipping)}</span></div>
      <div class="summary-row"><span>Tax</span><span>${formatPrice(tax)}</span></div>
      <div class="summary-row total"><span>Total</span><span>${formatPrice(total)}</span></div>
    </div>`;
}

/* ============================================
   Form Validation
   ============================================ */
function validateCheckoutForm() {
  let valid = true;
  const required = document.querySelectorAll('#checkout-form [required]');

  required.forEach(field => {
    const error = field.parentElement.querySelector('.error-message');
    if (!field.value.trim()) {
      field.classList.add('error');
      if (error) error.classList.add('show');
      valid = false;
    } else {
      field.classList.remove('error');
      if (error) error.classList.remove('show');
    }
  });

  if (valid) {
    showToast('Order placed successfully! Thank you for your purchase.', 'success');
    setToStorage('gc_cart', []);
    setTimeout(() => window.location.href = 'index.html', 2000);
  } else {
    showToast('Please fill in all required fields', 'error');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  return false;
}

/* ============================================
   GSAP Animations
   ============================================ */
function initAnimations() {
  if (typeof gsap === 'undefined') return;

  gsap.registerPlugin(ScrollTrigger);

  gsap.from('.hero-title', { opacity: 0, y: 60, duration: 1, ease: 'power4.out' });
  gsap.from('.hero-desc', { opacity: 0, y: 40, duration: 1, delay: 0.2, ease: 'power4.out' });
  gsap.from('.hero-badge', { opacity: 0, y: 30, duration: 0.8, delay: 0.1, ease: 'power3.out' });
  gsap.from('.hero-buttons', { opacity: 0, y: 40, duration: 1, delay: 0.4, ease: 'power4.out' });
  gsap.from('.hero-stats', { opacity: 0, y: 40, duration: 1, delay: 0.6, ease: 'power4.out' });
  gsap.from('.hero-image', { opacity: 0, x: 100, duration: 1.2, delay: 0.3, ease: 'power4.out' });

  gsap.utils.toArray('.animate-fade-up').forEach(el => {
    gsap.from(el, {
      opacity: 0,
      y: 50,
      duration: 0.8,
      ease: 'power3.out',
      scrollTrigger: { trigger: el, start: 'top 85%', toggleActions: 'play none none none' }
    });
  });

  gsap.utils.toArray('.animate-fade-left').forEach(el => {
    gsap.from(el, {
      opacity: 0,
      x: -60,
      duration: 0.8,
      ease: 'power3.out',
      scrollTrigger: { trigger: el, start: 'top 85%', toggleActions: 'play none none none' }
    });
  });

  gsap.utils.toArray('.animate-fade-right').forEach(el => {
    gsap.from(el, {
      opacity: 0,
      x: 60,
      duration: 0.8,
      ease: 'power3.out',
      scrollTrigger: { trigger: el, start: 'top 85%', toggleActions: 'play none none none' }
    });
  });

  gsap.utils.toArray('.category-card').forEach((card, i) => {
    gsap.from(card, {
      opacity: 0,
      y: 40,
      duration: 0.6,
      delay: i * 0.1,
      ease: 'power3.out',
      scrollTrigger: { trigger: card, start: 'top 85%', toggleActions: 'play none none none' }
    });
  });

  gsap.utils.toArray('.product-card').forEach((card, i) => {
    gsap.from(card, {
      opacity: 0,
      y: 40,
      duration: 0.6,
      delay: i * 0.08,
      ease: 'power3.out',
      scrollTrigger: { trigger: card, start: 'top 85%', toggleActions: 'play none none none' }
    });
  });

  gsap.utils.toArray('.stat-card').forEach((card, i) => {
    gsap.from(card, {
      opacity: 0,
      y: 40,
      duration: 0.6,
      delay: i * 0.1,
      ease: 'power3.out',
      scrollTrigger: { trigger: card, start: 'top 85%', toggleActions: 'play none none none' }
    });
  });

  gsap.utils.toArray('.animate-counter').forEach(counter => {
    const target = parseInt(counter.dataset.target);
    if (!target) return;
    gsap.from(counter, {
      textContent: 0,
      duration: 2,
      ease: 'power2.out',
      snap: { textContent: 1 },
      scrollTrigger: { trigger: counter, start: 'top 85%' },
      onUpdate: function() {
        counter.textContent = Math.round(this.targets()[0].textContent).toLocaleString();
      }
    });
  });
}

/* ============================================
   Mobile Menu
   ============================================ */
function initMobileMenu() {
  const btn = document.querySelector('.mobile-menu-btn');
  const close = document.querySelector('.mobile-menu-close');
  const overlay = document.querySelector('.mobile-menu-overlay');
  const menu = document.querySelector('.mobile-menu');

  if (!btn || !menu) return;

  function open() {
    menu.classList.add('active');
    if (overlay) overlay.classList.add('active');
    document.body.style.overflow = 'hidden';
  }

  function closeMenu() {
    menu.classList.remove('active');
    if (overlay) overlay.classList.remove('active');
    document.body.style.overflow = '';
  }

  btn.addEventListener('click', open);
  if (close) close.addEventListener('click', closeMenu);
  if (overlay) overlay.addEventListener('click', closeMenu);
}

/* ============================================
   Mega Menu
   ============================================ */
function initMegaMenu() {
  const trigger = document.querySelector('.nav-links > li:first-child');
  const mega = document.querySelector('.mega-menu');
  if (!trigger || !mega) return;

  trigger.addEventListener('mouseenter', () => mega.classList.add('active'));
  trigger.addEventListener('mouseleave', (e) => {
    if (!e.relatedTarget || !e.relatedTarget.closest('.mega-menu')) {
      mega.classList.remove('active');
    }
  });
  const wrapper = document.querySelector('.navbar .container');
  if (wrapper) {
    wrapper.addEventListener('mouseleave', (e) => {
      if (!e.relatedTarget || !e.relatedTarget.closest('.mega-menu')) {
        mega.classList.remove('active');
      }
    });
  }
  mega.addEventListener('mouseenter', () => mega.classList.add('active'));
  mega.addEventListener('mouseleave', () => mega.classList.remove('active'));
}

/* ============================================
   Navbar Scroll
   ============================================ */
function initNavbarScroll() {
  const navbar = document.querySelector('.navbar');
  if (!navbar) return;

  window.addEventListener('scroll', () => {
    if (window.scrollY > 50) {
      navbar.classList.add('scrolled');
    } else {
      navbar.classList.remove('scrolled');
    }
  });
}

/* ============================================
   Back to Top
   ============================================ */
function initBackToTop() {
  const btn = document.querySelector('.back-to-top');
  if (!btn) return;

  window.addEventListener('scroll', () => {
    btn.classList.toggle('visible', window.scrollY > 500);
  });

  btn.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
}

/* ============================================
   FAQ Accordion
   ============================================ */
function initFAQ() {
  document.querySelectorAll('.faq-question').forEach(btn => {
    btn.addEventListener('click', () => {
      const item = btn.closest('.faq-item');
      const isActive = item.classList.contains('active');
      document.querySelectorAll('.faq-item').forEach(i => i.classList.remove('active'));
      if (!isActive) item.classList.add('active');
    });
  });
}

/* ============================================
   Initialize Page
   ============================================ */
document.addEventListener('DOMContentLoaded', async () => {
  await loadProducts();
  updateCartCount();
  updateWishlistCount();
  updateWishlistButtons();
  initMobileMenu();
  initMegaMenu();
  initNavbarScroll();
  initBackToTop();
  initFAQ();
  initAnimations();

  const path = window.location.pathname;

  const homeGrid = document.getElementById('product-grid');
  if (homeGrid && !document.getElementById('shop-grid')) {
    renderProductCards(products.slice(0, 8), 'product-grid');
    renderProductCards(products.filter(p => p.rating >= 4.7).slice(0, 4), 'bestsellers-grid');
  }

  if (path.includes('shop.html') || (document.getElementById('shop-grid'))) {
    const shopSearch = document.getElementById('shop-search');
    const sortBy = document.getElementById('sort-by');
    if (shopSearch) shopSearch.addEventListener('input', filterProducts);
    if (sortBy) sortBy.addEventListener('change', filterProducts);
    document.querySelectorAll('.category-filter, .brand-filter').forEach(cb => cb.addEventListener('change', filterProducts));
    const priceSlider = document.getElementById('price-max');
    if (priceSlider) {
      priceSlider.addEventListener('input', (e) => {
        document.getElementById('price-display') && (document.getElementById('price-display').textContent = formatPrice(parseInt(e.target.value)));
        filterProducts();
      });
    }
    filterProducts();
  }

  if (path.includes('product.html') || document.getElementById('product-detail')) {
    const params = new URLSearchParams(window.location.search);
    const productId = params.get('id') || 1;
    renderProductPage(productId);
    const product = products.find(p => p.id === parseInt(productId));
    if (product) {
      renderRelatedProducts(product.category, product.id);
    }
  }

  if (path.includes('cart.html') || document.getElementById('cart-items')) {
    renderCart();
  }

  if (path.includes('wishlist.html') || document.getElementById('wishlist-items')) {
    renderWishlistPage();
  }

  if (path.includes('checkout.html') || document.getElementById('checkout-form')) {
    renderCheckoutSummary();
  }

  (function initSearch() {
    const searchInput = document.getElementById('search-input');
    const results = document.getElementById('search-results');
    if (!searchInput || !results) return;

    searchInput.addEventListener('input', (e) => {
      const term = e.target.value.toLowerCase().trim();
      if (!term) { results.classList.remove('active'); results.innerHTML = ''; return; }

      const matches = products.filter(p => p.name.toLowerCase().includes(term) || p.category.toLowerCase().includes(term)).slice(0, 6);
      if (!matches.length) {
        results.innerHTML = '<div class="search-no-results">No products found</div>';
      } else {
        results.innerHTML = matches.map(p => `
          <a href="product.html?id=${p.id}" class="search-result-item">
            <img src="${p.images[0]}" alt="${p.name}">
            <div>
              <strong>${p.name}</strong>
              <span>${formatPrice(p.price)}</span>
            </div>
          </a>
        `).join('');
      }
      results.classList.add('active');
    });

    document.addEventListener('click', (e) => {
      if (!e.target.closest('.search-container')) {
        results.classList.remove('active');
      }
    });
  })();
});

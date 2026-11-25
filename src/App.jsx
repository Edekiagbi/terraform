import { useEffect, useMemo, useState } from "react";
import {
  ArrowDownUp,
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronDown,
  Heart,
  Minus,
  Plus,
  Search,
  ShoppingBag,
  SlidersHorizontal,
  Sparkles,
  Star,
  X,
} from "lucide-react";
import { categories, products } from "./data/products.js";

const CART_STORAGE_KEY = "marketsquare-cart-v1";
const allCategory = "All finds";

function readSavedCart() {
  try {
    const saved = window.localStorage.getItem(CART_STORAGE_KEY);
    if (!saved) return { items: [], message: "" };

    const parsed = JSON.parse(saved);
    if (parsed?.version !== 1 || !Array.isArray(parsed.items)) {
      return {
        items: [],
        message: "Your saved cart could not be read, so we started a fresh one.",
      };
    }

    const validProducts = new Set(products.map((product) => product.id));
    const items = parsed.items.filter(
      (item) =>
        validProducts.has(item?.id) &&
        Number.isInteger(item?.quantity) &&
        item.quantity > 0 &&
        item.quantity <= 99,
    );

    return { items, message: "" };
  } catch (error) {
    console.error("Could not read the saved MarketSquare cart.", error);
    return {
      items: [],
      message: "Your saved cart is unavailable in this browser right now.",
    };
  }
}

function ProductCard({ product, onOpen, onAdd, isFavorite, onToggleFavorite }) {
  return (
    <article className="product-card group">
      <div className="product-image-wrap">
        <button
          className="product-image-button"
          type="button"
          onClick={() => onOpen(product)}
          aria-label={`View ${product.name}`}
        >
          <img className="product-image" src={product.image} alt={product.name} loading="lazy" />
          {product.badge && <span className="product-badge">{product.badge}</span>}
        </button>
        <button
          className={`favorite-button ${isFavorite ? "is-favorite" : ""}`}
          type="button"
          onClick={() => onToggleFavorite(product.id)}
          aria-label={`${isFavorite ? "Remove" : "Add"} ${product.name} ${isFavorite ? "from" : "to"} favorites`}
          aria-pressed={isFavorite}
        >
          <Heart size={17} fill={isFavorite ? "currentColor" : "none"} />
        </button>
        <button className="quick-add" type="button" onClick={() => onAdd(product.id)}>
          <Plus size={15} strokeWidth={2.2} />
          Add to bag
        </button>
      </div>
      <button className="product-copy" type="button" onClick={() => onOpen(product)}>
        <span className="product-category">{product.category}</span>
        <span className="product-name">{product.name}</span>
        <span className="product-meta">
          <span className="product-price">${product.price.toFixed(2)}</span>
          <span className="product-rating">
            <Star size={13} fill="currentColor" />
            {product.rating}
            <span className="review-count">({product.reviews})</span>
          </span>
        </span>
      </button>
    </article>
  );
}

function App() {
  const [cart, setCart] = useState(readSavedCart);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState(allCategory);
  const [sortOrder, setSortOrder] = useState("featured");
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [cartOpen, setCartOpen] = useState(false);
  const [favorites, setFavorites] = useState([]);
  const [addedProductId, setAddedProductId] = useState("");

  useEffect(() => {
    try {
      window.localStorage.setItem(
        CART_STORAGE_KEY,
        JSON.stringify({ version: 1, items: cart.items }),
      );
    } catch (error) {
      console.error("Could not save the MarketSquare cart.", error);
      setCart((current) => ({
        ...current,
        message: "Cart changes could not be saved in this browser.",
      }));
    }
  }, [cart.items]);

  useEffect(() => {
    if (!selectedProduct && !cartOpen) return undefined;

    function closeOnEscape(event) {
      if (event.key === "Escape") {
        setSelectedProduct(null);
        setCartOpen(false);
      }
    }

    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [selectedProduct, cartOpen]);

  const visibleProducts = useMemo(() => {
    const query = search.trim().toLowerCase();
    const filtered = products.filter((product) => {
      const matchesCategory = category === allCategory || product.category === category;
      const matchesSearch =
        !query ||
        `${product.name} ${product.category} ${product.description}`.toLowerCase().includes(query);
      return matchesCategory && matchesSearch;
    });

    if (sortOrder === "price-low") return filtered.sort((a, b) => a.price - b.price);
    if (sortOrder === "price-high") return filtered.sort((a, b) => b.price - a.price);
    if (sortOrder === "top-rated") return filtered.sort((a, b) => b.rating - a.rating);
    return filtered.sort((a, b) => Number(b.featured) - Number(a.featured));
  }, [category, search, sortOrder]);

  const cartProducts = useMemo(
    () =>
      cart.items.flatMap((item) => {
        const product = products.find((candidate) => candidate.id === item.id);
        return product ? [{ ...product, quantity: item.quantity }] : [];
      }),
    [cart.items],
  );
  const cartCount = cartProducts.reduce((total, item) => total + item.quantity, 0);
  const subtotal = cartProducts.reduce((total, item) => total + item.price * item.quantity, 0);
  const featuredProducts = products.filter((product) => product.featured);

  function addToCart(productId) {
    setCart((current) => {
      const existing = current.items.find((item) => item.id === productId);
      const items = existing
        ? current.items.map((item) =>
            item.id === productId
              ? { ...item, quantity: Math.min(item.quantity + 1, 99) }
              : item,
          )
        : [...current.items, { id: productId, quantity: 1 }];
      return { ...current, items };
    });
    setAddedProductId(productId);
    window.setTimeout(() => setAddedProductId(""), 1200);
  }

  function changeQuantity(productId, amount) {
    setCart((current) => ({
      ...current,
      items: current.items
        .map((item) =>
          item.id === productId
            ? { ...item, quantity: Math.min(item.quantity + amount, 99) }
            : item,
        )
        .filter((item) => item.quantity > 0),
    }));
  }

  function removeFromCart(productId) {
    setCart((current) => ({
      ...current,
      items: current.items.filter((item) => item.id !== productId),
    }));
  }

  function toggleFavorite(productId) {
    setFavorites((current) =>
      current.includes(productId)
        ? current.filter((id) => id !== productId)
        : [...current, productId],
    );
  }

  function chooseCategory(nextCategory) {
    setCategory(nextCategory);
    document.getElementById("catalog")?.scrollIntoView({ behavior: "smooth" });
  }

  function scrollToCatalog() {
    document.getElementById("catalog")?.scrollIntoView({ behavior: "smooth" });
  }

  return (
    <div className="app-shell">
      <div className="announcement-bar">
        <Sparkles size={14} />
        A little something extra: free shipping on orders over $75
        <ArrowRight size={14} />
      </div>

      <header className="site-header">
        <a className="brand" href="#" aria-label="MarketSquare home">
          <span className="brand-mark">
            <span />
            <span />
            <span />
            <span />
          </span>
          <span>market<span className="brand-light">square</span></span>
        </a>

        <nav className="desktop-nav" aria-label="Main navigation">
          <button type="button" onClick={() => chooseCategory(allCategory)}>Shop all</button>
          <button type="button" onClick={() => chooseCategory("Home & Living")}>Home & Living</button>
          <button type="button" onClick={() => chooseCategory("Fashion")}>Fashion</button>
          <button type="button" onClick={() => chooseCategory("Electronics")}>Electronics</button>
        </nav>

        <div className="header-actions">
          <label className="header-search">
            <Search size={17} />
            <input
              type="search"
              placeholder="Search finds..."
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                if (event.target.value) setCategory(allCategory);
              }}
              onFocus={scrollToCatalog}
              aria-label="Search products"
            />
          </label>
          <button className="cart-button" type="button" onClick={() => setCartOpen(true)} aria-label={`Open bag, ${cartCount} items`}>
            <ShoppingBag size={19} strokeWidth={1.8} />
            <span className="cart-label">Bag</span>
            <span className="cart-count">{cartCount}</span>
          </button>
        </div>
      </header>

      <main>
        {cart.message && (
          <div className="storage-message" role="status">
            {cart.message}
            <button type="button" aria-label="Dismiss message" onClick={() => setCart((current) => ({ ...current, message: "" }))}>
              <X size={15} />
            </button>
          </div>
        )}

        <section className="hero-section">
          <div className="hero-copy">
            <span className="eyebrow"><span className="eyebrow-dot" /> GOOD THINGS, FOUND HERE</span>
            <h1>Find your next<br />favorite <em>thing.</em></h1>
            <p>Thoughtful finds for your home, your everyday, and the people you love. A little less scrolling, a lot more good stuff.</p>
            <div className="hero-actions">
              <button className="button button-dark" type="button" onClick={scrollToCatalog}>
                Explore the shop <ArrowRight size={16} />
              </button>
              <span className="hero-note"><span className="avatar-stack"><i>J</i><i>M</i><i>A</i></span> Loved by good finders everywhere</span>
            </div>
            <div className="hero-footnote">
              <span><Check size={14} /> Thoughtfully picked</span>
              <span><Check size={14} /> Independent makers</span>
              <span><Check size={14} /> Easy, joyful shopping</span>
            </div>
          </div>
          <div className="hero-art">
            <div className="hero-image-main">
              <img
                src="https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?auto=format&fit=crop&w=1200&q=90"
                alt="Warm, thoughtfully styled living room"
              />
            </div>
            <div className="hero-image-float">
              <img
                src="https://images.unsplash.com/photo-1514228742587-6b1558fcca3d?auto=format&fit=crop&w=500&q=85"
                alt="Handmade ceramic mug"
              />
            </div>
            <div className="hero-sticker"><span>GOOD<br />FINDS</span><Star size={17} fill="currentColor" /></div>
            <div className="hero-caption">
              <span>01 / EVERYDAY EDIT</span>
              <span>Made for living well</span>
            </div>
          </div>
        </section>

        <section className="category-section section-wrap" aria-labelledby="categories-title">
          <div className="section-heading">
            <div>
              <span className="eyebrow">A GOOD PLACE TO START</span>
              <h2 id="categories-title">A little bit of everything.</h2>
            </div>
            <button className="text-link" type="button" onClick={() => chooseCategory(allCategory)}>
              Browse all <ArrowRight size={15} />
            </button>
          </div>
          <div className="category-grid">
            {categories.map((item, index) => (
              <button
                className={`category-tile category-tile-${index + 1}`}
                key={item.name}
                type="button"
                onClick={() => chooseCategory(item.name)}
              >
                <img src={item.image} alt="" loading="lazy" />
                <span className="category-overlay" />
                <span className="category-copy">
                  <span>{item.description}</span>
                  <strong>{item.name}</strong>
                </span>
                <span className="category-arrow"><ArrowUpRightIcon /></span>
              </button>
            ))}
          </div>
        </section>

        <section className="featured-section section-wrap" aria-labelledby="featured-title">
          <div className="section-heading">
            <div>
              <span className="eyebrow">A FEW THINGS WE LOVE</span>
              <h2 id="featured-title">The good stuff, right now.</h2>
            </div>
            <button className="text-link" type="button" onClick={scrollToCatalog}>
              See all finds <ArrowRight size={15} />
            </button>
          </div>
          <div className="product-grid featured-grid">
            {featuredProducts.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                onOpen={setSelectedProduct}
                onAdd={addToCart}
                isFavorite={favorites.includes(product.id)}
                onToggleFavorite={toggleFavorite}
              />
            ))}
          </div>
        </section>

        <section className="maker-note">
          <span className="maker-stamp"><Sparkles size={20} /></span>
          <div>
            <span className="eyebrow">A LITTLE MORE MEANING</span>
            <h2>Small makers. Big good energy.</h2>
            <p>We look for the thoughtful details, the lasting materials, and the makers who care about what they put into the world.</p>
          </div>
          <button className="button button-outline" type="button" onClick={scrollToCatalog}>
            Meet your next favorite <ArrowRight size={15} />
          </button>
        </section>

        <section className="catalog-section section-wrap" id="catalog" aria-labelledby="catalog-title">
          <div className="section-heading catalog-heading">
            <div>
              <span className="eyebrow">THE MARKET SQUARE EDIT</span>
              <h2 id="catalog-title">{search ? "Your search, sorted." : "Find the thing you didn't know you needed."}</h2>
            </div>
            <label className="sort-control">
              <ArrowDownUp size={15} />
              <span className="sort-label">Sort:</span>
              <select value={sortOrder} onChange={(event) => setSortOrder(event.target.value)} aria-label="Sort products">
                <option value="featured">Featured</option>
                <option value="price-low">Price: low to high</option>
                <option value="price-high">Price: high to low</option>
                <option value="top-rated">Top rated</option>
              </select>
              <ChevronDown size={14} />
            </label>
          </div>

          <div className="catalog-toolbar">
            <div className="category-filters" aria-label="Filter by category">
              <SlidersHorizontal className="filter-icon" size={16} />
              {[allCategory, ...categories.map((item) => item.name)].map((item) => (
                <button
                  className={`filter-chip ${category === item ? "active" : ""}`}
                  type="button"
                  key={item}
                  onClick={() => setCategory(item)}
                  aria-pressed={category === item}
                >
                  {item}
                </button>
              ))}
            </div>
            <span className="result-count">{visibleProducts.length} lovely {visibleProducts.length === 1 ? "find" : "finds"}</span>
          </div>

          {visibleProducts.length ? (
            <div className="product-grid catalog-grid">
              {visibleProducts.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  onOpen={setSelectedProduct}
                  onAdd={addToCart}
                  isFavorite={favorites.includes(product.id)}
                  onToggleFavorite={toggleFavorite}
                />
              ))}
            </div>
          ) : (
            <div className="empty-search">
              <span className="empty-search-icon"><Search size={23} /></span>
              <h3>No finds just yet.</h3>
              <p>Try a different search or browse all the good stuff.</p>
              <button
                className="button button-dark"
                type="button"
                onClick={() => {
                  setSearch("");
                  setCategory(allCategory);
                }}
              >
                Show me everything <ArrowRight size={15} />
              </button>
            </div>
          )}
        </section>

        <section className="newsletter-section">
          <div className="newsletter-icon"><Sparkles size={21} /></div>
          <div>
            <span className="eyebrow">GOOD THINGS IN YOUR INBOX</span>
            <h2>A little inspiration goes a long way.</h2>
            <p>New finds, thoughtful stories, and the occasional very good deal. No noise.</p>
          </div>
          <form
            className="newsletter-form"
            onSubmit={(event) => {
              event.preventDefault();
              event.currentTarget.reset();
              window.alert("Thanks for stopping by! Newsletter sign-up will be available soon.");
            }}
          >
            <label className="sr-only" htmlFor="newsletter-email">Your email address</label>
            <input id="newsletter-email" type="email" placeholder="Your email address" required />
            <button type="submit" aria-label="Join the newsletter"><ArrowRight size={18} /></button>
          </form>
        </section>
      </main>

      <footer className="site-footer">
        <a className="brand footer-brand" href="#" aria-label="MarketSquare home">
          <span className="brand-mark"><span /><span /><span /><span /></span>
          <span>market<span className="brand-light">square</span></span>
        </a>
        <span>Good things, all in one place.</span>
        <span className="footer-note">Made for everyday living <span>✳</span> © 2026 MarketSquare</span>
      </footer>

      {selectedProduct && (
        <div className="overlay product-overlay" onMouseDown={() => setSelectedProduct(null)}>
          <section
            className="product-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="product-dialog-title"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <button className="icon-button dialog-close" type="button" onClick={() => setSelectedProduct(null)} aria-label="Close product details">
              <X size={20} />
            </button>
            <div className="dialog-image">
              <img src={selectedProduct.image} alt={selectedProduct.name} />
              {selectedProduct.badge && <span className="product-badge">{selectedProduct.badge}</span>}
            </div>
            <div className="dialog-copy">
              <span className="eyebrow">{selectedProduct.category}</span>
              <h2 id="product-dialog-title">{selectedProduct.name}</h2>
              <div className="dialog-rating"><Star size={15} fill="currentColor" /> {selectedProduct.rating} <span>({selectedProduct.reviews} happy reviews)</span></div>
              <p className="dialog-description">{selectedProduct.description}</p>
              <ul className="product-details">
                {selectedProduct.details.map((detail) => <li key={detail}><Check size={15} />{detail}</li>)}
              </ul>
              <div className="dialog-bottom">
                <span className="dialog-price">${selectedProduct.price.toFixed(2)}</span>
                <button
                  className="button button-dark"
                  type="button"
                  onClick={() => addToCart(selectedProduct.id)}
                >
                  {addedProductId === selectedProduct.id ? <><Check size={16} /> Added to bag</> : <><ShoppingBag size={16} /> Add to bag</>}
                </button>
              </div>
            </div>
          </section>
        </div>
      )}

      {cartOpen && (
        <div className="overlay cart-overlay" onMouseDown={() => setCartOpen(false)}>
          <aside
            className="cart-drawer"
            role="dialog"
            aria-modal="true"
            aria-labelledby="cart-title"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="drawer-header">
              <div>
                <span className="eyebrow">YOUR GOOD FINDS</span>
                <h2 id="cart-title">Your bag <span>({cartCount})</span></h2>
              </div>
              <button className="icon-button" type="button" onClick={() => setCartOpen(false)} aria-label="Close bag">
                <X size={20} />
              </button>
            </div>
            {cartProducts.length ? (
              <>
                <div className="cart-items">
                  {cartProducts.map((item) => (
                    <article className="cart-item" key={item.id}>
                      <img src={item.image} alt="" />
                      <div className="cart-item-copy">
                        <span className="product-category">{item.category}</span>
                        <h3>{item.name}</h3>
                        <span className="cart-item-price">${item.price.toFixed(2)}</span>
                        <div className="quantity-control" aria-label={`Quantity for ${item.name}`}>
                          <button type="button" onClick={() => changeQuantity(item.id, -1)} aria-label={`Decrease ${item.name} quantity`}><Minus size={13} /></button>
                          <span>{item.quantity}</span>
                          <button type="button" onClick={() => changeQuantity(item.id, 1)} aria-label={`Increase ${item.name} quantity`}><Plus size={13} /></button>
                        </div>
                      </div>
                      <button className="remove-item" type="button" onClick={() => removeFromCart(item.id)}>Remove</button>
                    </article>
                  ))}
                </div>
                <div className="cart-summary">
                  <div className="shipping-note">
                    {subtotal >= 75 ? <><Check size={15} /> You've unlocked free shipping!</> : <>You're ${(75 - subtotal).toFixed(2)} away from free shipping</>}
                  </div>
                  <div className="subtotal-row"><span>Subtotal</span><strong>${subtotal.toFixed(2)}</strong></div>
                  <p>Shipping and any applicable taxes are calculated at checkout.</p>
                  <button className="button button-dark checkout-button" type="button" onClick={() => window.alert("Checkout is a demo feature. No payment will be collected.")}>
                    Continue to checkout <ArrowRight size={16} />
                  </button>
                  <button className="continue-shopping" type="button" onClick={() => setCartOpen(false)}>
                    <ArrowLeft size={14} /> Keep looking around
                  </button>
                </div>
              </>
            ) : (
              <div className="empty-cart">
                <span className="empty-cart-icon"><ShoppingBag size={24} /></span>
                <h3>Your bag is taking a little break.</h3>
                <p>When something catches your eye, you can save it here.</p>
                <button className="button button-dark" type="button" onClick={() => setCartOpen(false)}>
                  Find something lovely <ArrowRight size={15} />
                </button>
              </div>
            )}
          </aside>
        </div>
      )}
    </div>
  );
}

function ArrowUpRightIcon() {
  return <ArrowRight size={16} className="arrow-up-right" />;
}

export default App;

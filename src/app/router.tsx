import type { ComponentType } from 'react'
import { createBrowserRouter, Outlet, type RouteObject } from 'react-router'
import AdminLayout from '@/pages/admin/AdminLayout'
import AppLoading from '@/pages/errors/AppLoading'
import NotFoundPage from '@/pages/errors/NotFoundPage'
import RootError from '@/pages/errors/RootError'
import LoginPage from '@/pages/login/LoginPage'

/** Sahifa alohida bo'lak (chunk) bo'lib yuklanadi: mijoz Telegram'da admin kodini yuklamaydi. */
const page = (load: () => Promise<{ default: ComponentType }>) => async () => ({ Component: (await load()).default })

/**
 * Manzillar (hammasi bitta ilovada; ma'lumot — backendda, mijoz buyurtmasi kassaga socket orqali darhol tushadi):
 *
 *   /                 mijoz ilovasi (Telegram Mini App): bosh sahifa, katalog, atir, savat, buyurtmalar
 *   /login            xodim kirishi (PIN)
 *   /kassa            kassa: buyurtmalar navbati, sotuv, bugungi savdo
 *   /admin            admin: dashboard, katalog, ombor, moliya, sozlamalar
 *
 * Xodim bo'limlari katta-kichik harfga sezgir (`caseSensitive`): ruxsat (session.canOpen), mavzu va xato sahifasi tili
 * (storageKeys.isStaffPath) manzilni aynan "/admin", "/kassa" deb tekshiradi — "/ADMIN" esa admin paneli emas, 404.
 */
const routes: RouteObject[] = [
  {
    id: 'root',
    Component: Outlet,
    HydrateFallback: AppLoading,
    ErrorBoundary: RootError,
    children: [
      {
        path: '/',
        lazy: page(() => import('@/pages/customer/CustomerLayout')),
        children: [
          { index: true, lazy: page(() => import('@/pages/customer/home/HomePage')) },
          { path: 'catalog', lazy: page(() => import('@/pages/customer/catalog/CatalogPage')) },
          { path: 'categories', lazy: page(() => import('@/pages/customer/categories/CategoriesPage')) },
          { path: 'product/:id', lazy: page(() => import('@/pages/customer/product/ProductPage')) },
          { path: 'cart', lazy: page(() => import('@/pages/customer/cart/CartPage')) },
          { path: 'checkout', lazy: page(() => import('@/pages/customer/checkout/CheckoutPage')) },
          { path: 'favorites', lazy: page(() => import('@/pages/customer/favorites/FavoritesPage')) },
          { path: 'profile', lazy: page(() => import('@/pages/customer/profile/ProfilePage')) },
          { path: 'orders/:id', lazy: page(() => import('@/pages/customer/orders/OrderPage')) },
        ],
      },
      { path: '/login', caseSensitive: true, Component: LoginPage },
      {
        path: '/kassa',
        caseSensitive: true,
        lazy: page(() => import('@/pages/kassa/KassaLayout')),
        children: [
          { index: true, lazy: page(() => import('@/pages/kassa/board/OrdersBoardPage')) },
          { path: 'sale', lazy: page(() => import('@/pages/kassa/pos/PosPage')) },
          { path: 'history', lazy: page(() => import('@/pages/kassa/history/SalesHistoryPage')) },
        ],
      },
      {
        path: '/admin',
        caseSensitive: true,
        Component: AdminLayout,
        children: [
          { index: true, lazy: page(() => import('@/pages/admin/ops/DashboardPage')) },
          { path: 'orders', lazy: page(() => import('@/pages/admin/ops/OrdersPage')) },
          { path: 'customers', lazy: page(() => import('@/pages/admin/ops/CustomersPage')) },
          { path: 'stock', lazy: page(() => import('@/pages/admin/ops/StockPage')) },
          { path: 'purchases', lazy: page(() => import('@/pages/admin/ops/PurchasesPage')) },
          { path: 'inventory', lazy: page(() => import('@/pages/admin/ops/InventoryPage')) },
          { path: 'writeoffs', lazy: page(() => import('@/pages/admin/ops/WriteOffsPage')) },
          { path: 'suppliers', lazy: page(() => import('@/pages/admin/ops/SuppliersPage')) },
          { path: 'expenses', lazy: page(() => import('@/pages/admin/ops/ExpensesPage')) },
          { path: 'products', lazy: page(() => import('@/pages/admin/catalog/ProductsPage')) },
          { path: 'products/new', lazy: page(() => import('@/pages/admin/catalog/ProductEditPage')) },
          { path: 'products/:id', lazy: page(() => import('@/pages/admin/catalog/ProductEditPage')) },
          { path: 'brands', lazy: page(() => import('@/pages/admin/catalog/BrandsPage')) },
          { path: 'categories', lazy: page(() => import('@/pages/admin/catalog/CategoriesPage')) },
          { path: 'notes', lazy: page(() => import('@/pages/admin/catalog/NotesPage')) },
          { path: 'accords', lazy: page(() => import('@/pages/admin/catalog/AccordsPage')) },
          { path: 'flakons', lazy: page(() => import('@/pages/admin/catalog/FlakonsPage')) },
          { path: 'banners', lazy: page(() => import('@/pages/admin/catalog/BannersPage')) },
          { path: 'reviews', lazy: page(() => import('@/pages/admin/catalog/ReviewsPage')) },
          { path: 'users', lazy: page(() => import('@/pages/admin/catalog/UsersPage')) },
          { path: 'settings', lazy: page(() => import('@/pages/admin/catalog/SettingsPage')) },
          { path: '*', Component: NotFoundPage },
        ],
      },
      { path: '*', Component: NotFoundPage },
    ],
  },
]

export const router = createBrowserRouter(routes)

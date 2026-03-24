import AppRouter from './router';

export interface CartItemData {
  product: {
    id: number;
    image: string;
    images?: string[];
    alt: string;
    title: string;
    price: string;
    non_discount_price?: string;
    description: string;
    category?: string;
    status?: string;
    sort_order?: number;
  };
  quantity: number;
}

function App() {
  return <AppRouter />;
}

export default App;

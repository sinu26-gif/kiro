/**
 * Database types for Supabase.
 *
 * In production we generate this with:
 *   npx supabase gen types typescript --project-id <id> --schema public
 *
 * This file is hand-written to match supabase/migrations/* until we set up
 * the CLI. Keep it in sync when the schema changes.
 */

export type Json = string | number | boolean | null | { [key: string]: Json } | Json[];

type Timestamp = string;

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          role: "admin" | "shopkeeper";
          full_name: string | null;
          created_at: Timestamp;
          updated_at: Timestamp;
        };
        Insert: {
          id: string;
          role: "admin" | "shopkeeper";
          full_name?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["profiles"]["Insert"]>;
        Relationships: [];
      };
      categories: {
        Row: {
          id: string;
          name: string;
          slug: string;
          parent_id: string | null;
          sort_order: number;
          created_at: Timestamp;
        };
        Insert: {
          id?: string;
          name: string;
          slug: string;
          parent_id?: string | null;
          sort_order?: number;
        };
        Update: Partial<Database["public"]["Tables"]["categories"]["Insert"]>;
        Relationships: [];
      };
      products: {
        Row: {
          id: string;
          name: string;
          category_id: string | null;
          description: string | null;
          video_url: string | null;
          suggested_retail_paisa: number | null;
          status: "active" | "archived";
          created_at: Timestamp;
          updated_at: Timestamp;
        };
        Insert: {
          id?: string;
          name: string;
          category_id?: string | null;
          description?: string | null;
          video_url?: string | null;
          suggested_retail_paisa?: number | null;
          status?: "active" | "archived";
        };
        Update: Partial<Database["public"]["Tables"]["products"]["Insert"]>;
        Relationships: [];
      };
      product_photos: {
        Row: {
          id: string;
          product_id: string;
          url: string;
          sort_order: number;
          created_at: Timestamp;
        };
        Insert: {
          id?: string;
          product_id: string;
          url: string;
          sort_order?: number;
        };
        Update: Partial<Database["public"]["Tables"]["product_photos"]["Insert"]>;
        Relationships: [];
      };
      product_variants: {
        Row: {
          id: string;
          product_id: string;
          variant_name: string;
          sort_order: number;
          created_at: Timestamp;
        };
        Insert: {
          id?: string;
          product_id: string;
          variant_name: string;
          sort_order?: number;
        };
        Update: Partial<Database["public"]["Tables"]["product_variants"]["Insert"]>;
        Relationships: [];
      };
      set_types: {
        Row: {
          id: string;
          variant_id: string;
          label: string;
          sizes: string[];
          price_paisa: number;
          warehouse_stock: number;
          reorder_threshold: number;
          created_at: Timestamp;
          updated_at: Timestamp;
        };
        Insert: {
          id?: string;
          variant_id: string;
          label: string;
          sizes: string[];
          price_paisa: number;
          warehouse_stock?: number;
          reorder_threshold?: number;
        };
        Update: Partial<Database["public"]["Tables"]["set_types"]["Insert"]>;
        Relationships: [];
      };
      shopkeepers: {
        Row: {
          id: string;
          profile_id: string;
          shop_name: string;
          owner_name: string;
          phone: string;
          address: string | null;
          location_lat: number | null;
          location_lng: number | null;
          logo_url: string | null;
          status: "pending" | "active" | "suspended";
          document_path: string | null;
          document_type: string | null;
          self_registered: boolean;
          created_at: Timestamp;
          updated_at: Timestamp;
        };
        Insert: {
          id?: string;
          profile_id: string;
          shop_name: string;
          owner_name: string;
          phone: string;
          address?: string | null;
          location_lat?: number | null;
          location_lng?: number | null;
          logo_url?: string | null;
          status?: "pending" | "active" | "suspended";
          document_path?: string | null;
          document_type?: string | null;
          self_registered?: boolean;
        };
        Update: Partial<Database["public"]["Tables"]["shopkeepers"]["Insert"]>;
        Relationships: [];
      };
      shopkeeper_pricing: {
        Row: {
          id: string;
          shopkeeper_id: string;
          set_type_id: string;
          override_paisa: number | null;
          discount_percent: number | null;
          note: string | null;
          created_at: Timestamp;
          updated_at: Timestamp;
        };
        Insert: {
          id?: string;
          shopkeeper_id: string;
          set_type_id: string;
          override_paisa?: number | null;
          discount_percent?: number | null;
          note?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["shopkeeper_pricing"]["Insert"]>;
        Relationships: [];
      };
      orders: {
        Row: {
          id: string;
          shopkeeper_id: string;
          status: "pending" | "packed" | "shipped" | "delivered" | "cancelled";
          subtotal_paisa: number;
          discount_paisa: number;
          total_paisa: number;
          payment_method: "cod" | "bank" | "esewa" | "khalti";
          payment_status: "unpaid" | "paid";
          free_delivery: boolean;
          estimated_delivery_at: string | null;
          notes_to_admin: string | null;
          cancellation_reason: string | null;
          placed_at: Timestamp;
          packed_at: Timestamp | null;
          shipped_at: Timestamp | null;
          delivered_at: Timestamp | null;
          cancelled_at: Timestamp | null;
          created_at: Timestamp;
          updated_at: Timestamp;
        };
        Insert: {
          id?: string;
          shopkeeper_id: string;
          status?: "pending" | "packed" | "shipped" | "delivered" | "cancelled";
          subtotal_paisa?: number;
          discount_paisa?: number;
          total_paisa?: number;
          payment_method: "cod" | "bank" | "esewa" | "khalti";
          payment_status?: "unpaid" | "paid";
          free_delivery?: boolean;
          estimated_delivery_at?: string | null;
          notes_to_admin?: string | null;
          cancellation_reason?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["orders"]["Insert"]>;
        Relationships: [];
      };
      order_items: {
        Row: {
          id: string;
          order_id: string;
          set_type_id: string;
          set_quantity: number;
          unit_price_paisa: number;
          line_total_paisa: number;
          created_at: Timestamp;
        };
        Insert: {
          id?: string;
          order_id: string;
          set_type_id: string;
          set_quantity: number;
          unit_price_paisa: number;
          line_total_paisa: number;
        };
        Update: Partial<Database["public"]["Tables"]["order_items"]["Insert"]>;
        Relationships: [];
      };
      shop_stock: {
        Row: {
          id: string;
          shopkeeper_id: string;
          variant_id: string;
          size: string;
          quantity: number;
          created_at: Timestamp;
          updated_at: Timestamp;
        };
        Insert: {
          id?: string;
          shopkeeper_id: string;
          variant_id: string;
          size: string;
          quantity?: number;
        };
        Update: Partial<Database["public"]["Tables"]["shop_stock"]["Insert"]>;
        Relationships: [];
      };
      stock_movements: {
        Row: {
          id: string;
          scope: "warehouse" | "shop";
          shopkeeper_id: string | null;
          set_type_id: string | null;
          variant_id: string | null;
          size: string | null;
          delta: number;
          reason:
            | "restock"
            | "order_shipped"
            | "order_delivered"
            | "retail_sale"
            | "manual_adjust"
            | "return_exchange";
          reference_id: string | null;
          actor_profile_id: string | null;
          note: string | null;
          created_at: Timestamp;
        };
        Insert: {
          id?: string;
          scope: "warehouse" | "shop";
          shopkeeper_id?: string | null;
          set_type_id?: string | null;
          variant_id?: string | null;
          size?: string | null;
          delta: number;
          reason: Database["public"]["Tables"]["stock_movements"]["Row"]["reason"];
          reference_id?: string | null;
          actor_profile_id?: string | null;
          note?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["stock_movements"]["Insert"]>;
        Relationships: [];
      };
      shop_customers: {
        Row: {
          id: string;
          shopkeeper_id: string;
          name: string | null;
          phone: string | null;
          notes: string | null;
          created_at: Timestamp;
          updated_at: Timestamp;
        };
        Insert: {
          id?: string;
          shopkeeper_id: string;
          name?: string | null;
          phone?: string | null;
          notes?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["shop_customers"]["Insert"]>;
        Relationships: [];
      };
      custom_products: {
        Row: {
          id: string;
          shopkeeper_id: string;
          name: string;
          photo_url: string | null;
          price_paisa: number;
          stock_qty: number;
          status: "active" | "archived";
          created_at: Timestamp;
          updated_at: Timestamp;
        };
        Insert: {
          id?: string;
          shopkeeper_id: string;
          name: string;
          photo_url?: string | null;
          price_paisa: number;
          stock_qty?: number;
          status?: "active" | "archived";
        };
        Update: Partial<Database["public"]["Tables"]["custom_products"]["Insert"]>;
        Relationships: [];
      };
      pos_sales: {
        Row: {
          id: string;
          shopkeeper_id: string;
          customer_id: string | null;
          subtotal_paisa: number;
          discount_paisa: number;
          total_paisa: number;
          return_policy_text: string;
          created_at: Timestamp;
        };
        Insert: {
          id?: string;
          shopkeeper_id: string;
          customer_id?: string | null;
          subtotal_paisa: number;
          discount_paisa?: number;
          total_paisa: number;
          return_policy_text?: string;
        };
        Update: Partial<Database["public"]["Tables"]["pos_sales"]["Insert"]>;
        Relationships: [];
      };
      pos_sale_items: {
        Row: {
          id: string;
          sale_id: string;
          variant_id: string | null;
          custom_product_id: string | null;
          size: string | null;
          quantity: number;
          unit_price_paisa: number;
          line_total_paisa: number;
          created_at: Timestamp;
        };
        Insert: {
          id?: string;
          sale_id: string;
          variant_id?: string | null;
          custom_product_id?: string | null;
          size?: string | null;
          quantity: number;
          unit_price_paisa: number;
          line_total_paisa: number;
        };
        Update: Partial<Database["public"]["Tables"]["pos_sale_items"]["Insert"]>;
        Relationships: [];
      };
      pos_payments: {
        Row: {
          id: string;
          sale_id: string;
          method: "cash" | "esewa" | "khalti" | "other";
          amount_paisa: number;
          created_at: Timestamp;
        };
        Insert: {
          id?: string;
          sale_id: string;
          method: "cash" | "esewa" | "khalti" | "other";
          amount_paisa: number;
        };
        Update: Partial<Database["public"]["Tables"]["pos_payments"]["Insert"]>;
        Relationships: [];
      };
      notifications: {
        Row: {
          id: string;
          recipient_profile_id: string;
          category: "order" | "stock" | "leaderboard" | "reward" | "system" | "marketing";
          title: string;
          body: string | null;
          link: string | null;
          read_at: Timestamp | null;
          created_at: Timestamp;
        };
        Insert: {
          id?: string;
          recipient_profile_id: string;
          category: Database["public"]["Tables"]["notifications"]["Row"]["category"];
          title: string;
          body?: string | null;
          link?: string | null;
          read_at?: Timestamp | null;
        };
        Update: Partial<Database["public"]["Tables"]["notifications"]["Insert"]>;
        Relationships: [];
      };
      rewards: {
        Row: {
          id: string;
          cycle_label: string;
          shopkeeper_id: string;
          rank: number;
          reward_type: "discount_percent" | "free_set" | "custom_item";
          reward_value: string;
          created_by: string | null;
          created_at: Timestamp;
        };
        Insert: {
          id?: string;
          cycle_label: string;
          shopkeeper_id: string;
          rank: number;
          reward_type: Database["public"]["Tables"]["rewards"]["Row"]["reward_type"];
          reward_value: string;
          created_by?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["rewards"]["Insert"]>;
        Relationships: [];
      };
      app_events: {
        Row: {
          id: string;
          event_type: string;
          actor_profile_id: string | null;
          shopkeeper_id: string | null;
          payload: Json;
          created_at: Timestamp;
        };
        Insert: {
          id?: string;
          event_type: string;
          actor_profile_id?: string | null;
          shopkeeper_id?: string | null;
          payload?: Json;
        };
        Update: Partial<Database["public"]["Tables"]["app_events"]["Insert"]>;
        Relationships: [];
      };
      cart_items: {
        Row: {
          id: string;
          shopkeeper_id: string;
          set_type_id: string;
          quantity: number;
          created_at: Timestamp;
          updated_at: Timestamp;
        };
        Insert: {
          id?: string;
          shopkeeper_id: string;
          set_type_id: string;
          quantity: number;
        };
        Update: Partial<Database["public"]["Tables"]["cart_items"]["Insert"]>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      leaderboard_total_npr: {
        Args: { limit_count?: number };
        Returns: {
          rank: number;
          shopkeeper_id: string;
          shop_name: string;
          address: string | null;
          total_paisa: number;
          total_orders: number;
        }[];
      };
      leaderboard_total_sets: {
        Args: { limit_count?: number };
        Returns: {
          rank: number;
          shopkeeper_id: string;
          shop_name: string;
          total_sets: number;
        }[];
      };
      leaderboard_recent_activity: {
        Args: { limit_count?: number };
        Returns: {
          rank: number;
          shopkeeper_id: string;
          shop_name: string;
          recent_orders: number;
          recent_paisa: number;
        }[];
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};

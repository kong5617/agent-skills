/**
 * Types for Vinted's unofficial `/api/v2` JSON responses.
 *
 * These endpoints are not publicly documented by Vinted, so every field here is
 * optional/best-effort based on cross-referencing multiple independent open-source
 * Vinted API wrappers. Formatting code must not assume any field is present.
 */

export interface VintedMoney {
  amount?: string;
  currency_code?: string;
}

export interface VintedPhoto {
  id?: number;
  url?: string;
  full_size_url?: string;
}

export interface VintedUserSummary {
  id?: number;
  login?: string;
  business?: boolean;
  photo?: VintedPhoto;
}

export interface VintedItemSummary {
  id?: number;
  title?: string;
  price?: VintedMoney;
  total_item_price?: VintedMoney;
  brand_title?: string;
  size_title?: string;
  status?: string;
  url?: string;
  photo?: VintedPhoto;
  photos?: VintedPhoto[];
  user?: VintedUserSummary;
  favourite_count?: number;
  is_visible?: boolean;
}

export interface VintedSearchResponse {
  items?: VintedItemSummary[];
  pagination?: {
    current_page?: number;
    total_pages?: number;
    total_entries?: number;
    per_page?: number;
  };
}

export interface VintedItemDetail extends VintedItemSummary {
  description?: string;
  color1?: string;
  color2?: string;
  material_title?: string;
  package_size_id?: number;
  view_count?: number;
  created_at_ts?: string;
  updated_at_ts?: string;
  catalog_id?: number;
  video_game_rating?: string;
}

export interface VintedItemDetailResponse {
  item?: VintedItemDetail;
}

export interface VintedUserProfile {
  id?: number;
  login?: string;
  real_name?: string;
  city?: string;
  country_title?: string;
  item_count?: number;
  given_item_count?: number;
  followers_count?: number;
  following_count?: number;
  positive_feedback_count?: number;
  negative_feedback_count?: number;
  neutral_feedback_count?: number;
  feedback_reputation?: number;
  business?: boolean;
  verification?: Record<string, unknown>;
  created_at?: string;
  last_loged_on_ts?: string;
  photo?: VintedPhoto;
}

export interface VintedUserResponse {
  user?: VintedUserProfile;
}

export interface VintedUserItemsResponse {
  items?: VintedItemSummary[];
  pagination?: VintedSearchResponse["pagination"];
}

export interface VintedFeedback {
  id?: number;
  user?: VintedUserSummary;
  comment?: string;
  rating?: number;
  created_at?: string;
  item?: { id?: number; title?: string };
}

export interface VintedFeedbacksResponse {
  user_feedbacks?: VintedFeedback[];
  feedbacks?: VintedFeedback[];
  pagination?: VintedSearchResponse["pagination"];
}

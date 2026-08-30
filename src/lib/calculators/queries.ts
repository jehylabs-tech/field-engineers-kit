import { cache } from "react";
import {
  getLocalPublishedCalculatorBySlug,
  getLocalPublishedCalculators,
  getLocalPublishedCalculatorsByCategory,
} from "@/lib/calculators/local-seed";
import type { Calculator } from "@/lib/calculators/types";
import { createClient } from "@/lib/supabase/server";
import { createPublicClient } from "@/lib/supabase/public";

const REMOTE_TIMEOUT_MS = 800;

type QueryResult<T> = {
  data: T | null;
  error: { message?: string } | null;
};

function timedOut<T>(): Promise<QueryResult<T>> {
  return new Promise((resolve) => {
    setTimeout(
      () => resolve({ data: null, error: { message: "timeout" } }),
      REMOTE_TIMEOUT_MS,
    );
  });
}

async function fromRemoteOrLocal<T>(
  remote: () => PromiseLike<QueryResult<T>>,
  fallback: () => T,
  isEmpty?: (value: T) => boolean,
): Promise<T> {
  const localData = fallback();
  if (localData != null) {
    if (Array.isArray(localData) && localData.length > 0) {
      return localData;
    }
    if (!Array.isArray(localData) && typeof localData === "object") {
      return localData;
    }
  }

  const supabase = createPublicClient();
  if (!supabase) {
    return localData;
  }

  try {
    const result = await Promise.race([
      Promise.resolve(remote()),
      timedOut<T>(),
    ]);

    if (result.error || result.data == null) {
      return localData;
    }

    if (isEmpty?.(result.data)) {
      return localData;
    }

    return result.data;
  } catch {
    return localData;
  }
}

export async function getCalculators(): Promise<{
  calculators: Calculator[];
  error: string | null;
}> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("calculators")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    return { calculators: [], error: error.message };
  }

  return {
    calculators: (data ?? []) as Calculator[],
    error: null,
  };
}

export const getPublishedCalculators = cache(
  async (): Promise<Calculator[]> => {
    const local = getLocalPublishedCalculators();
    if (local.length > 0) {
      return local;
    }

    return fromRemoteOrLocal(
      () =>
        createPublicClient()!
          .from("calculators")
          .select("*")
          .eq("is_published", true)
          .order("created_at", { ascending: false }) as unknown as PromiseLike<
          QueryResult<Calculator[]>
        >,
      getLocalPublishedCalculators,
      (rows) => rows.length === 0,
    );
  },
);

export const getPublishedCalculatorBySlug = cache(
  async (slug: string): Promise<Calculator | null> => {
    const local = getLocalPublishedCalculatorBySlug(slug);
    if (local) {
      return local;
    }

    return fromRemoteOrLocal(
      () =>
        createPublicClient()!
          .from("calculators")
          .select("*")
          .eq("slug", slug)
          .eq("is_published", true)
          .maybeSingle() as unknown as PromiseLike<QueryResult<Calculator>>,
      () => getLocalPublishedCalculatorBySlug(slug),
    );
  },
);

export async function getRelatedCalculators(
  category: string,
  excludeSlug: string,
  limit = 2,
): Promise<Calculator[]> {
  const calculators = await getPublishedCalculators();
  return calculators
    .filter(
      (calculator) =>
        calculator.category === category && calculator.slug !== excludeSlug,
    )
    .slice(0, limit);
}

export const getPublishedCalculatorsByCategory = cache(
  async (category: string): Promise<Calculator[]> => {
    const local = getLocalPublishedCalculatorsByCategory(category);
    if (local.length > 0) {
      return local;
    }

    return fromRemoteOrLocal(
      () =>
        createPublicClient()!
          .from("calculators")
          .select("*")
          .eq("is_published", true)
          .eq("category", category)
          .order("created_at", { ascending: false }) as unknown as PromiseLike<
          QueryResult<Calculator[]>
        >,
      () => getLocalPublishedCalculatorsByCategory(category),
      (rows) => rows.length === 0,
    );
  },
);

export async function getCalculatorById(
  id: string,
): Promise<{ calculator: Calculator | null; error: string | null }> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("calculators")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    return { calculator: null, error: error.message };
  }

  return {
    calculator: (data as Calculator | null) ?? null,
    error: null,
  };
}

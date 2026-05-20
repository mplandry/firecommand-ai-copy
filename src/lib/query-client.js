import { QueryClient, QueryCache, MutationCache } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';

let redirectingToLogin = false;

function handleAuthError(error) {
	if ((error?.status === 403 || error?.status === 401) && !redirectingToLogin) {
		redirectingToLogin = true;
		base44.auth.redirectToLogin(window.location.href);
	}
}

export const queryClientInstance = new QueryClient({
	queryCache: new QueryCache({
		onError: handleAuthError,
	}),
	mutationCache: new MutationCache({
		onError: handleAuthError,
	}),
	defaultOptions: {
		queries: {
			refetchOnWindowFocus: false,
			retry: (failureCount, error) => {
				if (error?.status === 403 || error?.status === 401) return false;
				return failureCount < 1;
			},
		},
	},
});
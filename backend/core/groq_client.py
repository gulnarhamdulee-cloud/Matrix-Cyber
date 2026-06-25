"""
Multi-API Key Groq Manager
Isolates rate limits and costs across different services
"""
import asyncio
import os
import time
from typing import Any, Dict, List, Optional, Literal
from enum import Enum
from dataclasses import dataclass
import groq

from config import get_settings
from core.logger import get_logger

logger = get_logger(__name__)
settings = get_settings()


class ModelTier(Enum):
    """Model tiers for different complexity levels."""
    FAST = "fast"
    STANDARD = "standard"
    CRITICAL = "critical"
    LARGE_CONTEXT = "large_context"
    STRUCTURED = "structured"


@dataclass
class ModelConfig:
    """Configuration for a specific model."""
    model_id: str
    description: str
    best_for: List[str]
    speed: str
    cost_tier: str
    context_window: int
    recommended_temp: float


class GroqModels:
    """Available Groq models with characteristics."""
    LLAMA_8B_INSTANT = ModelConfig(
        model_id="llama-3.1-8b-instant",
        description="Fastest model, ideal for simple patterns",
        best_for=["quick scans", "pattern matching"],
        speed="ultra-fast",
        cost_tier="lowest",
        context_window=128000,
        recommended_temp=0.2
    )
    LLAMA_70B_VERSATILE = ModelConfig(
        model_id="llama-3.3-70b-versatile",
        description="Best balance of speed and intelligence",
        best_for=["general purpose", "logic analysis"],
        speed="fast",
        cost_tier="medium",
        context_window=128000,
        recommended_temp=0.3
    )
    LLAMA_70B_TOOL_USE = ModelConfig(
        model_id="llama-3.3-70b-tool-use",
        description="Optimized for structured outputs",
        best_for=["JSON extraction", "API calls"],
        speed="fast",
        cost_tier="medium",
        context_window=128000,
        recommended_temp=0.1
    )
    MIXTRAL_8X7B = ModelConfig(
        model_id="llama-3.3-70b-versatile", # Replaced decommissioned Mixtral
        description="Large context window model (128k)",
        best_for=["large codebases", "long documents"],
        speed="medium",
        cost_tier="medium",
        context_window=128000,
        recommended_temp=0.3
    )
    LLAMA_70B_SPECDEC = ModelConfig(
        model_id="llama-3.1-70b-specdec",
        description="Enhanced accuracy with speculative decoding",
        best_for=["critical analysis", "verification"],
        speed="fast",
        cost_tier="medium",
        context_window=8192,
        recommended_temp=0.3
    )


class ServiceModelStrategy:
    """Strategy for selecting models based on service and task."""

    @staticmethod
    def get_model(service: 'ServiceType', tier: ModelTier = ModelTier.STANDARD) -> str:
        """Get appropriate model ID for service and tier."""
        
        # Scanner Strategy
        if service == ServiceType.SECURITY_SCANNER:
            if tier == ModelTier.FAST:
                return settings.groq_model_scanner_fast
            elif tier == ModelTier.CRITICAL:
                return settings.groq_model_scanner_critical
            else:
                return settings.groq_model_scanner_primary

        # Repo Analysis Strategy
        elif service == ServiceType.REPO_ANALYSIS:
            if tier == ModelTier.LARGE_CONTEXT:
                return settings.groq_model_repo_large_files
            else:
                return settings.groq_model_repo_primary

        # Chatbot Strategy
        elif service == ServiceType.CHATBOT:
            return settings.groq_model_chatbot
            
        # Fallback Strategy
        else:
            if tier == ModelTier.FAST:
                 return "llama-3.1-8b-instant"
            return settings.groq_model_fallback


class ServiceType(Enum):
    """Different services requiring API access."""
    SECURITY_SCANNER = "scanner"  # Website vulnerability scanning
    REPO_ANALYSIS = "repo"        # GitHub/code repository analysis
    CHATBOT = "chatbot"           # User-facing conversational AI
    FALLBACK = "fallback"         # Emergency backup key


# Forward reference fix for ServiceType in strategy


@dataclass
class KeyMetrics:
    """Track usage metrics per API key."""
    service: ServiceType
    total_requests: int = 0
    failed_requests: int = 0
    rate_limit_hits: int = 0
    total_tokens_used: int = 0
    last_reset: float = 0
    daily_limit: int = 14400  # Groq's free tier limit
    
    @property
    def requests_remaining(self) -> int:
        """Estimate remaining requests today."""
        # Reset counter if it's a new day
        if time.time() - self.last_reset > 86400:  # 24 hours
            return self.daily_limit
        return max(0, self.daily_limit - self.total_requests)
    
    @property
    def usage_percentage(self) -> float:
        """Current usage as percentage of daily limit."""
        return (self.total_requests / self.daily_limit) * 100


class MultiKeyGroqManager:
    """
    Manages multiple Groq API keys for different services.
    Provides isolation, failover, and usage tracking.
    Now enhanced with a rotating key pool of 10+ keys, exponential backoff,
    and a last-successful-key caching mechanism.
    """
    
    def __init__(self) -> None:
        """Initialize manager with multiple API keys and rotating pool."""
        def get_valid_key(val: str) -> Optional[str]:
            if not val or val.strip().lower().startswith(("your_", "replace_", "gsk_your")):
                return None
            return val.strip()

        self.keys: Dict[ServiceType, str] = {
            ServiceType.SECURITY_SCANNER: get_valid_key(settings.groq_api_key_scanner or os.getenv("GROQ_API_KEY_SCANNER")) or settings.groq_api_key,
            ServiceType.REPO_ANALYSIS: get_valid_key(settings.groq_api_key_repo or os.getenv("GROQ_API_KEY_REPO")) or settings.groq_api_key,
            ServiceType.CHATBOT: get_valid_key(settings.groq_api_key_chatbot or os.getenv("GROQ_API_KEY_CHATBOT")) or settings.groq_api_key,
            ServiceType.FALLBACK: get_valid_key(settings.groq_api_key_fallback or os.getenv("GROQ_API_KEY_FALLBACK")) or settings.groq_api_key,
        }
        
        # Initialize service-specific clients
        self.clients: Dict[ServiceType, Optional[groq.AsyncGroq]] = {}
        self.metrics: Dict[ServiceType, KeyMetrics] = {}
        
        for service, api_key in self.keys.items():
            if api_key:
                try:
                    self.clients[service] = groq.AsyncGroq(api_key=api_key)
                    self.metrics[service] = KeyMetrics(service=service, last_reset=time.time())
                    logger.info(f"Initialized Groq client for {service.value}")
                except Exception as e:
                    logger.error(f"Failed to initialize {service.value} client: {e}")
                    self.clients[service] = None
            else:
                self.clients[service] = None
                logger.warning(f"No API key provided for {service.value}")
        
        # Initialize rotating key pool
        self.pool_clients: List[groq.AsyncGroq] = []
        self.pool_keys: List[str] = []
        self.pool_cooldowns: List[float] = []      # timestamp until which key is in cooldown
        self.pool_failures: List[int] = []         # consecutive failures count for backoff
        self.pool_metrics: List[KeyMetrics] = []
        self.last_successful_pool_index: Optional[int] = None
        
        # Extract keys from settings.groq_keys_pool
        raw_keys = settings.groq_keys_pool.split(",") if settings.groq_keys_pool else []
        unique_keys = []
        for rk in raw_keys:
            val = get_valid_key(rk)
            if val and val not in unique_keys:
                unique_keys.append(val)
        
        # Also pull from existing service keys to enrich the pool
        for k in self.keys.values():
            val = get_valid_key(k)
            if val and val not in unique_keys:
                unique_keys.append(val)
                
        # Initialize pool clients
        for i, key in enumerate(unique_keys):
            try:
                client = groq.AsyncGroq(api_key=key)
                self.pool_clients.append(client)
                self.pool_keys.append(key)
                self.pool_cooldowns.append(0.0)
                self.pool_failures.append(0)
                self.pool_metrics.append(KeyMetrics(service=ServiceType.SECURITY_SCANNER, last_reset=time.time()))
                logger.info(f"Loaded Groq key #{i+1} into rotating pool")
            except Exception as e:
                logger.error(f"Failed to initialize pool key #{i+1}: {e}")
                
        logger.info(f"Initialized rotating key pool with {len(self.pool_clients)} active keys")
        
        # Validate at least one key is configured
        if not self.is_configured:
            logger.error("No Groq API keys configured!")
            
    @property
    def is_configured(self) -> bool:
        """Check if at least one client is configured (service-specific or pool)."""
        return len(self.pool_clients) > 0 or any(self.clients.values())
    
    def get_client(self, service: ServiceType) -> Optional[groq.AsyncGroq]:
        """Get client for specific service. Prefers pool for scanner."""
        if service == ServiceType.SECURITY_SCANNER and self.pool_clients:
            idx = self.last_successful_pool_index or 0
            if idx < len(self.pool_clients):
                return self.pool_clients[idx]
        return self.clients.get(service)
    
    def is_service_available(self, service: ServiceType) -> bool:
        """Check if service has available client and quota."""
        if service == ServiceType.SECURITY_SCANNER and self.pool_clients:
            # Check if there is at least one non-cooldown pool key
            now = time.time()
            return any(cooldown <= now for cooldown in self.pool_cooldowns)
            
        client = self.clients.get(service)
        if not client:
            return False
        
        metrics = self.metrics.get(service)
        if metrics and metrics.requests_remaining < 100:
            logger.warning(f"{service.value} approaching rate limit: {metrics.requests_remaining} remaining")
            return False
        
        return True
    
    def get_fallback_client(self, primary_service: ServiceType) -> Optional[groq.AsyncGroq]:
        """
        Get fallback client when primary service is unavailable.
        Priority: Rotating pool > FALLBACK key > Other services with capacity
        """
        # Try pool first if it's not the primary service already
        if primary_service != ServiceType.SECURITY_SCANNER and self.pool_clients:
            now = time.time()
            for idx, cooldown in enumerate(self.pool_cooldowns):
                if cooldown <= now:
                    logger.info(f"Using pool key #{idx+1} as fallback for {primary_service.value}")
                    return self.pool_clients[idx]

        # Try dedicated fallback key
        if self.clients.get(ServiceType.FALLBACK) and self.is_service_available(ServiceType.FALLBACK):
            logger.info(f"Using fallback key for {primary_service.value}")
            return self.clients[ServiceType.FALLBACK]
        
        # Try other services with remaining capacity
        for service, client in self.clients.items():
            if service != primary_service and self.is_service_available(service):
                metrics = self.metrics[service]
                if metrics.requests_remaining > 1000:  # Only use if plenty of quota
                    logger.info(f"Using {service.value} key as fallback for {primary_service.value}")
                    return client
        
        return None
    
    async def generate(
        self,
        service: ServiceType,
        prompt: str = "",
        system_prompt: str = "You are a helpful AI assistant.",
        model: Optional[str] = None,
        tier: ModelTier = ModelTier.STANDARD,
        temperature: Optional[float] = None,
        max_tokens: int = 4096,
        json_mode: bool = False,
        allow_fallback: bool = True,
        messages: Optional[List[Any]] = None
    ) -> Dict[str, Any]:
        """
        Generate completion using appropriate service key and model strategy.
        Rotates through the pool of keys with exponential backoff if primary or current key fails.
        """
        # 1. Determine Model
        if not model:
            model = ServiceModelStrategy.get_model(service, tier)
            
        # 2. Determine Temperature
        if temperature is None:
            if service == ServiceType.CHATBOT:
                temperature = settings.groq_chatbot_temperature
            elif tier == ModelTier.FAST or tier == ModelTier.STRUCTURED:
                temperature = 0.1
            else:
                temperature = 0.3

        if messages is None:
            messages = [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": prompt}
            ]
        
        kwargs = {
            "model": model,
            "messages": messages,
            "temperature": temperature,
            "max_tokens": max_tokens,
        }
        
        if json_mode:
            kwargs["response_format"] = {"type": "json_object"}

        # If using rotating pool (highly recommended for scanner or if pool is available)
        if self.pool_clients and (service == ServiceType.SECURITY_SCANNER or not self.clients.get(service)):
            return await self._generate_with_pool(kwargs, service)
            
        # Fallback to single-key client path if pool is not used or not initialized
        client = self.get_client(service)
        if not client or not self.is_service_available(service):
            if allow_fallback:
                logger.warning(f"{service.value} unavailable, attempting fallback")
                client = self.get_fallback_client(service)
                if not client:
                    available_clients = [c for s, c in self.clients.items() if c]
                    if available_clients:
                        client = available_clients[0]
                        service_used = [s for s, c in self.clients.items() if c == client][0]
                        logger.warning(f"Using {service_used.value} as last resort")
                    else:
                        raise Exception(f"No available API keys for {service.value}")
                else:
                    service_used = ServiceType.FALLBACK
            else:
                raise Exception(f"{service.value} API key exhausted and fallback disabled")
        else:
            service_used = service

        try:
            start_time = time.time()
            response = await client.chat.completions.create(**kwargs)
            duration = time.time() - start_time
            
            content = response.choices[0].message.content
            metrics = self.metrics[service_used]
            metrics.total_requests += 1
            metrics.total_tokens_used += response.usage.total_tokens
            
            return {
                "content": content,
                "service_used": service_used.value,
                "metrics": {
                    "duration": duration,
                    "tokens_used": response.usage.total_tokens,
                    "requests_remaining": metrics.requests_remaining,
                    "usage_percentage": metrics.usage_percentage
                }
            }
        except groq.RateLimitError as e:
            if allow_fallback:
                logger.warning(f"Rate limit on {service_used.value}, attempting fallback")
                fallback_client = self.get_fallback_client(service_used)
                if fallback_client:
                    # Retry with fallback
                    start_time = time.time()
                    response = await fallback_client.chat.completions.create(**kwargs)
                    duration = time.time() - start_time
                    return {
                        "content": response.choices[0].message.content,
                        "service_used": "fallback_pool",
                        "metrics": {
                            "duration": duration,
                            "tokens_used": response.usage.total_tokens,
                            "requests_remaining": 9999,
                            "usage_percentage": 0.0
                        }
                    }
            raise
        except Exception as e:
            logger.error(f"API error for {service_used.value}: {e}")
            raise

    async def _generate_with_pool(self, kwargs: Dict[str, Any], original_service: ServiceType) -> Dict[str, Any]:
        """Helper to run a request using the rotating pool of clients with exponential backoff."""
        num_keys = len(self.pool_clients)
        
        # Try to start with last successful index, otherwise 0
        start_idx = self.last_successful_pool_index if self.last_successful_pool_index is not None else 0
        
        last_exception = None
        now = time.time()
        
        # We try to find any available key in the pool
        # If all keys are in cooldown, we wait for the one with the shortest cooldown
        for attempt in range(num_keys * 2): # Try pool keys twice to allow backoffs
            idx = (start_idx + attempt) % num_keys
            
            # Check cooldown
            if self.pool_cooldowns[idx] > now:
                # If we've checked all and all are in cooldown, sleep a bit or try the next one
                continue
                
            client = self.pool_clients[idx]
            metrics = self.pool_metrics[idx]
            
            try:
                start_time = time.time()
                response = await client.chat.completions.create(**kwargs)
                duration = time.time() - start_time
                
                # Success! Reset failures, update cache and metrics
                self.pool_failures[idx] = 0
                self.pool_cooldowns[idx] = 0.0
                self.last_successful_pool_index = idx
                
                metrics.total_requests += 1
                metrics.total_tokens_used += response.usage.total_tokens
                
                logger.info(f"API call succeeded using pool key #{idx+1} (cache hit next time)")
                
                return {
                    "content": response.choices[0].message.content,
                    "service_used": f"pool_key_{idx+1}",
                    "metrics": {
                        "duration": duration,
                        "tokens_used": response.usage.total_tokens,
                        "requests_remaining": metrics.requests_remaining,
                        "usage_percentage": metrics.usage_percentage
                    }
                }
            except groq.RateLimitError as e:
                last_exception = e
                # Rate limit / Exhaustion -> Exponential backoff cooldown
                self.pool_failures[idx] += 1
                backoff_delay = min(60.0, 2.0 ** self.pool_failures[idx])
                self.pool_cooldowns[idx] = time.time() + backoff_delay
                metrics.rate_limit_hits += 1
                metrics.failed_requests += 1
                logger.warning(f"Rate limit hit on pool key #{idx+1}. Cooldown for {backoff_delay}s.")
                
            except Exception as e:
                last_exception = e
                self.pool_failures[idx] += 1
                backoff_delay = min(30.0, 1.5 ** self.pool_failures[idx])
                self.pool_cooldowns[idx] = time.time() + backoff_delay
                metrics.failed_requests += 1
                logger.error(f"Error on pool key #{idx+1}: {e}. Cooldown for {backoff_delay}s.")
                
        # If we got here, all keys were either in cooldown or failed.
        # Let's find the one with the minimum cooldown and wait for it
        min_cooldown_idx = 0
        min_cooldown = self.pool_cooldowns[0]
        for i in range(1, num_keys):
            if self.pool_cooldowns[i] < min_cooldown:
                min_cooldown = self.pool_cooldowns[i]
                min_cooldown_idx = i
                
        wait_time = max(0.1, min_cooldown - time.time())
        if wait_time < 10.0:  # Only wait if it's reasonable
            logger.warning(f"All keys in cooldown. Waiting {wait_time:.2f}s for key #{min_cooldown_idx+1}...")
            await asyncio.sleep(wait_time)
            # Try one more time with this key
            client = self.pool_clients[min_cooldown_idx]
            metrics = self.pool_metrics[min_cooldown_idx]
            try:
                start_time = time.time()
                response = await client.chat.completions.create(**kwargs)
                duration = time.time() - start_time
                self.pool_failures[min_cooldown_idx] = 0
                self.pool_cooldowns[min_cooldown_idx] = 0.0
                self.last_successful_pool_index = min_cooldown_idx
                metrics.total_requests += 1
                metrics.total_tokens_used += response.usage.total_tokens
                return {
                    "content": response.choices[0].message.content,
                    "service_used": f"pool_key_{min_cooldown_idx+1}",
                    "metrics": {
                        "duration": duration,
                        "tokens_used": response.usage.total_tokens,
                        "requests_remaining": metrics.requests_remaining,
                        "usage_percentage": metrics.usage_percentage
                    }
                }
            except Exception as final_err:
                last_exception = final_err
                
        raise last_exception or Exception("All keys in rotating pool failed.")
    
    def get_usage_report(self) -> Dict[str, Any]:
        """
        Generate usage report across all services.
        Useful for monitoring and cost tracking.
        """
        report = {
            "timestamp": time.time(),
            "services": {}
        }
        
        total_requests = 0
        total_tokens = 0
        
        for service, metrics in self.metrics.items():
            if self.clients.get(service):
                service_data = {
                    "total_requests": metrics.total_requests,
                    "failed_requests": metrics.failed_requests,
                    "rate_limit_hits": metrics.rate_limit_hits,
                    "tokens_used": metrics.total_tokens_used,
                    "requests_remaining": metrics.requests_remaining,
                    "usage_percentage": round(metrics.usage_percentage, 2),
                    "status": "healthy" if metrics.usage_percentage < 80 else "warning"
                }
                
                report["services"][service.value] = service_data
                total_requests += metrics.total_requests
                total_tokens += metrics.total_tokens_used
                
        # Include pool keys report
        report["rotating_pool"] = {
            "total_keys": len(self.pool_clients),
            "keys": []
        }
        for idx, metrics in enumerate(self.pool_metrics):
            key_data = {
                "key_index": idx + 1,
                "total_requests": metrics.total_requests,
                "failed_requests": metrics.failed_requests,
                "rate_limit_hits": metrics.rate_limit_hits,
                "tokens_used": metrics.total_tokens_used,
                "cooldown_remaining": max(0.0, self.pool_cooldowns[idx] - time.time()),
                "consecutive_failures": self.pool_failures[idx]
            }
            report["rotating_pool"]["keys"].append(key_data)
        
        report["summary"] = {
            "total_requests": total_requests + sum(m.total_requests for m in self.pool_metrics),
            "total_tokens": total_tokens + sum(m.total_tokens_used for m in self.pool_metrics),
            "estimated_cost_usd": (total_tokens + sum(m.total_tokens_used for m in self.pool_metrics)) * 0.0000001
        }
        
        return report
    
    async def close(self):
        """Close all async clients."""
        for service, client in self.clients.items():
            if client:
                try:
                    await client.close()
                except Exception as e:
                    logger.error(f"Error closing Groq client for {service.value}: {e}")
        self.clients = {}
        
        # Close pool clients
        for idx, client in enumerate(self.pool_clients):
            try:
                await client.close()
            except Exception as e:
                logger.error(f"Error closing pool client #{idx+1}: {e}")
        self.pool_clients = []
        logger.info("All Groq clients and rotating pool closed")



# Lazy initialization for multi-loop environments
class LazyGroqManager:
    def __init__(self):
        self._instance: Optional[MultiKeyGroqManager] = None
        
    def _get_instance(self) -> MultiKeyGroqManager:
        if self._instance is None:
            self._instance = MultiKeyGroqManager()
        return self._instance
        
    def __getattr__(self, name):
        return getattr(self._get_instance(), name)

    async def force_dispose(self):
        """Dispose of instance to allow re-initialization in new loop."""
        if self._instance:
            await self._instance.close()
            self._instance = None

groq_manager = LazyGroqManager()


def get_groq_manager() -> MultiKeyGroqManager:
    """Get singleton manager instance."""
    return groq_manager._get_instance()


# Convenience functions for each service
async def scanner_generate(prompt: str = "", **kwargs) -> Dict[str, Any]:
    """Generate using security scanner key."""
    return await groq_manager.generate(
        service=ServiceType.SECURITY_SCANNER,
        prompt=prompt,
        **kwargs
    )


async def repo_generate(prompt: str = "", **kwargs) -> Dict[str, Any]:
    """Generate using repository analysis key."""
    return await groq_manager.generate(
        service=ServiceType.REPO_ANALYSIS,
        prompt=prompt,
        **kwargs
    )


async def chatbot_generate(prompt: str = "", **kwargs) -> Dict[str, Any]:
    """Generate using chatbot key."""
    return await groq_manager.generate(
        service=ServiceType.CHATBOT,
        prompt=prompt,
        **kwargs
    )
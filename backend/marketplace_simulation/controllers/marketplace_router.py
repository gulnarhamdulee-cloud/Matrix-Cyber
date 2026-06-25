from fastapi import APIRouter, Depends, HTTPException, Query, status, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Optional, Dict, Any
from core.database import get_db
from marketplace_simulation.services.marketplace_service import MarketplaceService
from marketplace_simulation.services.valuation_service import ValuationService
from marketplace_simulation.services.financial_impact_service import FinancialImpactService
from marketplace_simulation.models import ExploitPricing, FinancialImpact, VulnerabilityValuation
from models import Vulnerability
from sqlalchemy import select
from pydantic import BaseModel
import subprocess
import sys
import os
from api.deps import get_current_user, get_optional_user
from models.user import User
from typing import Optional as TypingOptional

router = APIRouter(
    prefix="/marketplace",
    tags=["Marketplace Simulation"]
)

# Request Models
class AnalyzeRequest(BaseModel):
    companyProfile: Optional[Dict[str, Any]] = None

class ImportRequestId(BaseModel):
    dataType: str # 'exploits' | 'finance' | 'all'

# --- Endpoints ---

@router.get("/dashboard", response_model=Dict[str, Any])
async def get_dashboard(
    project_id: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get overview of marketplace statistics for the current user."""
    try:
        from models.scan import Scan
        # Auto-value any unvalued vulnerabilities for the current user on the fly
        unvalued_stmt = (
            select(Vulnerability.id)
            .join(Scan, Vulnerability.scan_id == Scan.id)
            .where(Scan.user_id == current_user.id)
            .where(Vulnerability.marketplace_value_avg.is_(None))
        )
        unvalued_res = await db.execute(unvalued_stmt)
        unvalued_ids = [r[0] for r in unvalued_res.all()]
        if unvalued_ids:
            print(f"[Marketplace] Auto-analyzing {len(unvalued_ids)} unvalued vulnerabilities for user {current_user.id} on the fly...")
            for vuln_id in unvalued_ids:
                try:
                    await MarketplaceService.analyze_vulnerability(vuln_id, db)
                except Exception as ae:
                    print(f"[Marketplace] On-the-fly valuation failed for vuln {vuln_id}: {ae}")
        
        stats = await MarketplaceService.get_dashboard_stats(db, user_id=current_user.id)
        return stats
    except Exception as e:
        print(f"Dashboard error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
@router.get("/all", response_model=List[Dict[str, Any]])
async def get_all_valuations(
    limit: int = 50,
    offset: int = 0,
    scan_id: Optional[int] = Query(None, description="Filter by Scan ID"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get all vulnerabilities analyzed for the current user, ordered by recency."""
    try:
        from models.scan import Scan
        # Auto-value any unvalued vulnerabilities for the current user on the fly
        unvalued_stmt = (
            select(Vulnerability.id)
            .join(Scan, Vulnerability.scan_id == Scan.id)
            .where(Scan.user_id == current_user.id)
            .where(Vulnerability.marketplace_value_avg.is_(None))
        )
        unvalued_res = await db.execute(unvalued_stmt)
        unvalued_ids = [r[0] for r in unvalued_res.all()]
        if unvalued_ids:
            print(f"[Marketplace] Auto-analyzing {len(unvalued_ids)} unvalued vulnerabilities for user {current_user.id} on the fly...")
            for vuln_id in unvalued_ids:
                try:
                    await MarketplaceService.analyze_vulnerability(vuln_id, db)
                except Exception as ae:
                    print(f"[Marketplace] On-the-fly valuation failed for vuln {vuln_id}: {ae}")

        return await MarketplaceService.get_all_valuations(db, limit, offset, scan_id, user_id=current_user.id)
    except Exception as e:
        print(f"All valuations error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
@router.get("/comparisons", response_model=Dict[str, Any])
async def get_comparisons(
    db: AsyncSession = Depends(get_db)
):
    """Get creative comparisons for total exploit value."""
    try:
        comparisons = await MarketplaceService.get_comparisons(db)
        return comparisons
    except Exception as e:
        print(f"Comparison error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/vulnerability/{vulnerability_id}/details", response_model=Dict[str, Any])
async def get_vulnerability_details(
    vulnerability_id: int,
    db: AsyncSession = Depends(get_db)
):
    """Get detailed marketplace analysis for a single vulnerability.
    Auto-triggers analysis if the vulnerability hasn't been valued yet.
    """
    try:
        # Check if already valued; if not, analyze on demand
        stmt = select(Vulnerability).where(Vulnerability.id == vulnerability_id)
        result = await db.execute(stmt)
        vuln = result.scalar_one_or_none()
        if vuln is None:
            raise HTTPException(status_code=404, detail=f"Vulnerability {vulnerability_id} not found")

        if vuln.marketplace_value_avg is None:
            # Not yet analyzed — run analysis inline (first time is always on demand)
            print(f"[Details] Auto-analyzing vulnerability {vulnerability_id} on demand...")

        analysis = await MarketplaceService.analyze_vulnerability(vulnerability_id, db)
        return analysis
    except HTTPException:
        raise
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        print(f"Details error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/vulnerability/{vulnerability_id}/explain", response_model=Dict[str, Any])
async def get_easy_explanation(
    vulnerability_id: int,
    db: AsyncSession = Depends(get_db)
):
    """Get natural language explanation for non-technical users."""
    try:
        explanation = await MarketplaceService.get_easy_explanation(vulnerability_id, db)
        return {"explanation": explanation}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/scan/{scan_id}/explain", response_model=Dict[str, Any])
async def get_scan_explanation(
    scan_id: int,
    db: AsyncSession = Depends(get_db)
):
    """Get strategic executive summary for an entire scan."""
    try:
        explanation = await MarketplaceService.get_scan_explanation(scan_id, db)
        return {"explanation": explanation}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/analyze/{vulnerability_id}", response_model=Dict[str, Any])
async def analyze_vulnerability(
    vulnerability_id: int,
    request: AnalyzeRequest,
    db: AsyncSession = Depends(get_db)
):
    """Analyze a specific vulnerability (Valuation + Impact + ROI)."""
    try:
        analysis = await MarketplaceService.analyze_vulnerability(
            vulnerability_id,
            db
        )
        return analysis
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        print(f"Analysis error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/import/", response_model=Dict[str, Any])
async def trigger_import(
    request: ImportRequestId,
    # current_user: User = Depends(get_current_admin_user) # TODO: Add Auth when available
):
    """Trigger data import via CLI utility."""
    if request.dataType not in ['exploits', 'finance', 'all']:
        raise HTTPException(status_code=400, detail="Invalid dataType")
    
    import subprocess
    import sys
    import os
    
    # Locate the importer script
    script_path = os.path.join("marketplace_simulation", "utils", "data_importer.py")
    if not os.path.exists(script_path):
         script_path = os.path.join("backend", "marketplace_simulation", "utils", "data_importer.py")
    
    cmd = [sys.executable, script_path]
    if request.dataType == 'exploits':
        cmd.append("--exploits")
    elif request.dataType == 'finance':
        cmd.append("--finance")
    elif request.dataType == 'all':
        cmd.append("--all")
        
    try:
        # Run async/detached or wait? For API, better to wait if fast, or background task.
        # Given it's a simulation, waiting is fine for small CSVs.
        result = subprocess.run(cmd, capture_output=True, text=True, cwd=os.getcwd())
        
        if result.returncode != 0:
            raise Exception(f"Import failed: {result.stderr}")
            
        return {"status": "success", "message": "Import completed", "output": result.stdout}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# --- Existing Endpoints (Kept for compatibility/granular access) ---

@router.get("/exploits", response_model=None)
async def list_exploits(
    vulnerability_type: Optional[str] = None,
    limit: int = 100,
    db: AsyncSession = Depends(get_db)
):
    """List exploit pricing data."""
    exploits = await MarketplaceService.get_exploit_pricing(db, vulnerability_type, limit)
    return exploits

@router.get("/impacts", response_model=None)
async def list_impacts(
    industry: Optional[str] = None,
    limit: int = 100,
    db: AsyncSession = Depends(get_db)
):
    """List financial impact data."""
    impacts = await MarketplaceService.get_financial_impact(db, industry, limit)
    return impacts

@router.get("/valuation/{vulnerability_id}", response_model=None)
async def get_valuation(
    vulnerability_id: int,
    db: AsyncSession = Depends(get_db)
):
    """Get latest valuation for a vulnerability."""
    valuation = await MarketplaceService.get_valuation(db, vulnerability_id)
    if not valuation:
        raise HTTPException(status_code=404, detail="Valuation not found")
    return valuation

# Deprecated/Atomic endpoints can remain or be redirected
@router.post("/valuation/{vulnerability_id}", response_model=None)
async def calculate_valuation(
    vulnerability_id: int,
    industry: str = Query("General", description="Target Industry"),
    company_size: str = Query("Small", description="Company Size"),
    db: AsyncSession = Depends(get_db)
):
    """Calculate and store valuation for a vulnerability."""
    try:
         # Reuse the service method or keep atomic
        result = await db.execute(select(Vulnerability).where(Vulnerability.id == vulnerability_id))
        vuln = result.scalar_one_or_none()
        if not vuln: raise HTTPException(status_code=404, detail="Vulnerability not found")
        
        return await ValuationService.calculate_exploit_value(db, vuln, industry, company_size)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/impact/{vulnerability_id}", response_model=None)
async def calculate_impact(
    vulnerability_id: int,
    profile: dict, 
    db: AsyncSession = Depends(get_db)
):
    """Calculate estimated financial impact of a breach."""
    try:
        result = await db.execute(select(Vulnerability).where(Vulnerability.id == vulnerability_id))
        vuln = result.scalar_one_or_none()
        if not vuln: raise HTTPException(status_code=404, detail="Vulnerability not found")

        return await FinancialImpactService.calculate_breach_impact(db, vuln, profile)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


async def _run_backfill(db_url: str):
    """Background task: analyze all unanalyzed vulnerabilities."""
    from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker

    engine = create_async_engine(db_url)
    session_factory = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async with session_factory() as session:
        result = await session.execute(
            select(Vulnerability).where(Vulnerability.marketplace_value_avg.is_(None))
        )
        vulns = result.scalars().all()
        count = 0
        for v in vulns:
            try:
                await MarketplaceService.analyze_vulnerability(v.id, session) # type: ignore
                count += 1
            except Exception as e:
                print(f"[Backfill] Failed for vuln {v.id}: {e}")
        print(f"[Backfill] Done: {count}/{len(vulns)} vulnerabilities analyzed.")

    await engine.dispose()


@router.post("/backfill", response_model=Dict[str, Any])
async def backfill_valuations(
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Trigger marketplace valuation backfill for all unanalyzed vulnerabilities.
    Requires authentication. Runs as a background task.
    """
    from config import get_settings
    settings = get_settings()

    # Count unanalyzed vulnerabilities
    result = await db.execute(
        select(Vulnerability).where(Vulnerability.marketplace_value_avg.is_(None))
    )
    unanalyzed = result.scalars().all()

    if not unanalyzed:
        return {"status": "skipped", "message": "All vulnerabilities already have valuations.", "queued": 0}

    # Kick off in background so the response returns immediately
    background_tasks.add_task(_run_backfill, settings.database_url)

    return {
        "status": "queued",
        "message": f"Backfill started for {len(unanalyzed)} vulnerabilities. Check server logs for progress.",
        "queued": len(unanalyzed),
    }

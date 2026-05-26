"""
Background workers for handling long-running tasks.
"""
import asyncio
from typing import Optional, List
from datetime import datetime, timezone, timedelta
from sqlalchemy import select, and_
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import async_session_maker
from models.scan import Scan, ScanStatus
from models.vulnerability import Vulnerability, Severity, VulnerabilityType
from agents.orchestrator import orchestrator


def run_scan_task(scan_id: int):
    """
    Execute a scan in the background (sync wrapper for async).
    
    Args:
        scan_id: ID of the scan to execute
    """
    print(f"[Worker] Starting scan task for ID: {scan_id}")
    
    # Create new event loop for background task
    loop = None
    try:
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        loop.run_until_complete(_run_scan_async(scan_id))
    except Exception as e:
        print(f"[Worker] Error in scan task: {e}")
        import traceback
        traceback.print_exc()
    finally:
        if loop:
            loop.close()


async def _run_scan_async(scan_id: int):
    """
    Async implementation of the scan task.
    
    Args:
        scan_id: ID of the scan to execute
    """
    print(f"[Worker] Running async scan for ID: {scan_id}")
    
    async with async_session_maker() as db:
        scan: Optional[Scan] = None
        try:
            # Fetch scan
            result = await db.execute(
                select(Scan).where(Scan.id == scan_id)
            )
            scan = result.scalar_one_or_none()
            
            if not scan:
                print(f"[Worker] Scan {scan_id} not found")
                return
            
            # Run actual scan
            await _execute_orchestrator(db, scan)
            
        except Exception as e:
            print(f"[Worker] Error in scan task: {e}")
            import traceback
            traceback.print_exc()
            if scan:
                scan.status = ScanStatus.FAILED  # type: ignore
                scan.error_message = str(e)  # type: ignore
                scan.completed_at = datetime.now(timezone.utc)  # type: ignore
                await db.commit()

async def _apply_cached_results(db: AsyncSession, current_scan: Scan, cached_scan: Scan):
    """Copy results from a cached scan to the current scan."""
    print(f"[Worker] Applying cached results from {cached_scan.id} to {current_scan.id}")
    
    # Update status
    current_scan.status = ScanStatus.COMPLETED  # type: ignore
    current_scan.progress = 100  # type: ignore
    current_scan.started_at = datetime.now(timezone.utc)  # type: ignore
    current_scan.completed_at = datetime.now(timezone.utc)  # type: ignore
    
    # Copy vulnerabilities
    # We need to fetch vulnerabilities specifically if they aren't loaded, 
    # but usually we'd query them. For simplicity, let's assume we can fetch them.
    # Since we are in an async session, lazy loading might warn, so let's query.
    vuln_query = select(Vulnerability).where(Vulnerability.scan_id == cached_scan.id)
    vuln_result = await db.execute(vuln_query)
    vulnerabilities = vuln_result.scalars().all()
    
    for vuln in vulnerabilities:
        new_vuln = Vulnerability(
            scan_id=current_scan.id,
            vulnerability_type=vuln.vulnerability_type,
            severity=vuln.severity,
            title=vuln.title,
            description=vuln.description,
            url=vuln.url,
            method=vuln.method,
            parameter=vuln.parameter,
            evidence=vuln.evidence,
            remediation=vuln.remediation,
            ai_analysis=vuln.ai_analysis,
            ai_confidence=vuln.ai_confidence,
            owasp_category=vuln.owasp_category,
            cwe_id=vuln.cwe_id,
            response_snippet=vuln.response_snippet,
            detected_by=vuln.detected_by,
            reference_links=vuln.reference_links,
            is_false_positive=vuln.is_false_positive,
            is_suppressed=vuln.is_suppressed,
            suppression_reason=vuln.suppression_reason,
            final_verdict=vuln.final_verdict,
            action_required=vuln.action_required,
            detection_confidence=vuln.detection_confidence,
            exploit_confidence=vuln.exploit_confidence,
            scope_impact=vuln.scope_impact
        )
        db.add(new_vuln)
    
    await db.commit()
    print("[Worker] Cached results applied successfully")

async def _execute_orchestrator(db: AsyncSession, scan: Scan):
    """Run the agent orchestrator."""
    # Use singleton to keep registered agents
    # orchestrator is imported globally
    print(f"[WORKER DEBUG] Orchestrator instance: {id(orchestrator)}")
    print(f"[WORKER DEBUG] Registered agents: {list(orchestrator.agents.keys())}")
    
    # Callback to update progress in DB
    async def progress_callback(progress: int, status_msg: str):
        # We need a fresh transaction or careful management here.
        # For simplicity in this async loop, we'll try to update the object attached to session.
        # NOTE: In high concurrency, frequent DB writes might need optimization.
        scan.progress = progress  # type: ignore
        # We might want to commit periodically
        try:
            await db.commit()
        except:
            await db.rollback()
    
    orchestrator.on_progress = progress_callback
    
    # Scan logic
    try:
        scan.status = ScanStatus.RUNNING  # type: ignore
        scan.started_at = datetime.now(timezone.utc)  # type: ignore
        await db.commit()
        
        # Run orchestrator
        # Map DB model logic to Orchestrator logic
        # Orchestrator returns List[AgentResult]
        results = await orchestrator.run_scan(
            target_url=scan.target_url,  # type: ignore
            agents_enabled=scan.agents_enabled,  # type: ignore
            scan_id=scan.id,  # type: ignore
            custom_headers=scan.custom_headers,  # type: ignore
            custom_cookies=scan.custom_cookies  # type: ignore
        )
        
        # Save results
        for res in results:
            vuln = Vulnerability(
                scan_id=scan.id,
                vulnerability_type=res.vulnerability_type,
                severity=res.severity,
                title=res.title,
                description=res.description,
                url=res.url,
                method=res.method,
                parameter=res.parameter,
                evidence=res.evidence,
                remediation=res.remediation,
                ai_analysis=res.ai_analysis,
                ai_confidence=res.confidence,
                owasp_category=res.owasp_category,
                cwe_id=res.cwe_id,
                response_snippet=res.response_snippet,
                detected_by=res.agent_name,
                reference_links=res.reference_links,
                likelihood=res.likelihood,
                impact=res.impact,
                exploitability_rationale=res.exploitability_rationale,
                is_suppressed=res.is_suppressed,
                is_false_positive=res.is_false_positive,
                suppression_reason=res.suppression_reason,
                final_verdict=res.final_verdict,
                action_required=res.action_required,
                detection_confidence=res.detection_confidence,
                exploit_confidence=res.exploit_confidence,
                scope_impact=res.scope_impact
            )
            db.add(vuln)
        
        # Update scan counts based on results
        scan.total_vulnerabilities = len(results)  # type: ignore
        scan.critical_count = sum(1 for r in results if r.severity.value == 'critical')  # type: ignore
        scan.high_count = sum(1 for r in results if r.severity.value == 'high')  # type: ignore
        scan.medium_count = sum(1 for r in results if r.severity.value == 'medium')  # type: ignore
        scan.low_count = sum(1 for r in results if r.severity.value == 'low')  # type: ignore
        scan.info_count = sum(1 for r in results if r.severity.value == 'info')  # type: ignore
        
        scan.status = ScanStatus.COMPLETED  # type: ignore
        scan.completed_at = datetime.now(timezone.utc)  # type: ignore
        scan.progress = 100  # type: ignore
        await db.commit()

        # --- Marketplace Valuation: Auto-analyze all found vulnerabilities ---
        # Use a FRESH session to avoid state issues from the scan's committed session
        print(f"[Worker] Triggering marketplace valuation for scan {scan.id}...")
        try:
            from marketplace_simulation.services.marketplace_service import MarketplaceService
            # Get the IDs while the scan session is still active
            vuln_id_results = await db.execute(
                select(Vulnerability.id).where(Vulnerability.scan_id == scan.id)
            )
            saved_vuln_ids = [row[0] for row in vuln_id_results.all()]
            val_count = 0
            # Open a fresh session so valuation commits cleanly
            async with async_session_maker() as val_session:
                for vuln_id in saved_vuln_ids:
                    try:
                        await MarketplaceService.analyze_vulnerability(int(vuln_id), val_session)
                        val_count += 1
                    except Exception as ve:
                        print(f"[Worker] Marketplace valuation failed for vuln {vuln_id}: {ve}")
                        import traceback; traceback.print_exc()
            print(f"[Worker] Marketplace valuation complete: {val_count}/{len(saved_vuln_ids)} vulnerabilities analyzed.")
        except Exception as me:
            print(f"[Worker] Marketplace valuation step failed: {me}")
            import traceback; traceback.print_exc()
        # --- End Marketplace Valuation ---

    except Exception as e:
        import traceback
        print(f"[Worker] Orchestrator execution failed: {type(e).__name__}: {e}")
        traceback.print_exc()
        await db.rollback()
        raise e
    finally:
        await orchestrator.cleanup()

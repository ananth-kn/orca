import pytest
import json
from datetime import datetime, timezone
from unittest.mock import AsyncMock, patch, MagicMock

from app.agents.optimized_pipeline import process_chat_query, _is_simple_greeting, _is_simple_definition
from app.agents.planner import handle_query


@pytest.fixture
def mock_llm():
    """Mock LLM client for testing"""
    with patch('app.agents.optimized_pipeline.call_llm') as mock:
        yield mock


@pytest.fixture
def mock_tools():
    """Mock marine data tools"""
    with patch('app.agents.optimized_pipeline.fetch_sst') as mock_sst, \
         patch('app.agents.optimized_pipeline.fetch_chlorophyll') as mock_chl, \
         patch('app.agents.optimized_pipeline.fetch_waves') as mock_waves, \
         patch('app.agents.optimized_pipeline.fetch_weather') as mock_weather:
        
        mock_sst.return_value = {
            "sst_celsius": 28.5,
            "source": "Open-Meteo",
            "timestamp": "2026-09-08T12:00:00"
        }
        
        mock_chl.return_value = {
            "chlorophyll_mg_m3": 0.8,
            "source": "Copernicus Marine",
            "timestamp": "2026-09-08"
        }
        
        mock_waves.return_value = {
            "wave_height_m": 1.5,
            "wave_direction_deg": 180,
            "swell_period_s": 8.0,
            "safety_index": "safe",
            "source": "Copernicus Marine",
            "timestamp": "2026-09-08T12:00:00"
        }
        
        mock_weather.return_value = {
            "current": {
                "temperature_c": 29.0,
                "wind_speed_kmh": 15,
                "wind_direction_deg": 180,
                "weather_code": 0,
                "humidity_pct": 75
            },
            "source": "Open-Meteo"
        }
        
        yield {
            "sst": mock_sst,
            "chlorophyll": mock_chl,
            "waves": mock_waves,
            "weather": mock_weather,
        }


class TestGreetingDetection:
    def test_english_greeting(self):
        assert _is_simple_greeting("hi")
        assert _is_simple_greeting("hello")
        assert _is_simple_greeting("hey")
        assert _is_simple_greeting("good morning")
        assert _is_simple_greeting("thanks")
    
    def test_hindi_greeting(self):
        assert _is_simple_greeting("नमस्ते")
        assert _is_simple_greeting("नमस्कार")
    
    def test_tamil_greeting(self):
        assert _is_simple_greeting("வணக்கம்")
    
    def test_not_greeting(self):
        assert not _is_simple_greeting("is it safe to go fishing tomorrow?")
        assert not _is_simple_greeting("what is the wave height?")
        assert not _is_simple_greeting("where is the nearest PFZ?")


class TestDefinitionDetection:
    def test_sst_definition(self):
        assert _is_simple_definition("what is SST?")
        assert _is_simple_definition("define sea surface temperature")
        assert _is_simple_definition("sst meaning")
    
    def test_pfz_definition(self):
        assert _is_simple_definition("what is PFZ?")
        assert _is_simple_definition("meaning of potential fishing zone")
    
    def test_not_definition(self):
        assert not _is_simple_definition("what is the wave height?")
        assert not _is_simple_definition("is it safe?")


class TestGreetingFastPath:
    @pytest.mark.asyncio
    async def test_english_greeting_no_llm(self, mock_llm):
        result = await process_chat_query("hi", lang="en", session_id="test")
        
        assert result["mode"] == "direct"
        assert "ORCA" in result["answer"]
        assert result["intent"] == "greeting"
        assert result["confidence"] == "high"
        mock_llm.assert_not_called()
    
    @pytest.mark.asyncio
    async def test_hindi_greeting(self, mock_llm):
        result = await process_chat_query("नमस्ते", lang="hi", session_id="test")
        
        assert result["mode"] == "direct"
        assert result["language"] == "hi"
        mock_llm.assert_not_called()
    
    @pytest.mark.asyncio
    async def test_tamil_greeting(self, mock_llm):
        result = await process_chat_query("வணக்கம்", lang="ta", session_id="test")
        
        assert result["mode"] == "direct"
        assert result["language"] == "ta"
        mock_llm.assert_not_called()


class TestDefinitionFastPath:
    @pytest.mark.asyncio
    async def test_sst_definition_no_llm(self, mock_llm):
        result = await process_chat_query("What is SST?", lang="en", session_id="test")
        
        assert result["mode"] == "direct"
        assert "Sea Surface Temperature" in result["answer"]
        assert result["intent"] == "definition"
        mock_llm.assert_not_called()
    
    @pytest.mark.asyncio
    async def test_pfz_definition_hindi(self, mock_llm):
        result = await process_chat_query("PFZ क्या है?", lang="hi", session_id="test")
        
        assert result["mode"] == "direct"
        assert result["language"] == "hi"
        mock_llm.assert_not_called()
    
    @pytest.mark.asyncio
    async def test_pfz_definition_tamil(self, mock_llm):
        result = await process_chat_query("PFZ என்றால் என்ன?", lang="ta", session_id="test")
        
        assert result["mode"] == "direct"
        assert result["language"] == "ta"
        mock_llm.assert_not_called()


class TestMarineDataQuery:
    @pytest.mark.asyncio
    async def test_wave_query(self, mock_llm, mock_tools):
        # Router decides waves needed
        router_response = {
            "mode": "data",
            "intent": "marine_conditions",
            "tools": ["waves"],
            "needs_location": True,
            "needs_forecast": False,
        }
        
        mock_llm.side_effect = [
            json.dumps(router_response),
            "Waves are moderate at 1.5m, safe for fishing.",
        ]
        
        result = await process_chat_query(
            "What is the wave height?",
            lang="en",
            session_id="test",
            lat=9.28,
            lon=79.31,
        )
        
        assert result["mode"] == "data"
        assert result["intent"] == "marine_conditions"
        assert "waves" in result["sources"]
        assert mock_llm.call_count == 2
    
    @pytest.mark.asyncio
    async def test_safety_query(self, mock_llm, mock_tools):
        router_response = {
            "mode": "data",
            "intent": "safety",
            "tools": ["waves", "weather"],
            "needs_location": True,
            "needs_forecast": False,
            "needs_alerts": True,
        }
        
        mock_llm.side_effect = [
            json.dumps(router_response),
            "It looks safe for fishing tomorrow. Waves are moderate and no active warnings.",
        ]
        
        result = await process_chat_query(
            "Is it safe to go fishing tomorrow?",
            lang="en",
            session_id="test",
            lat=9.28,
            lon=79.31,
        )
        
        assert result["mode"] == "data"
        assert result["intent"] == "safety"
        assert mock_llm.call_count == 2


class TestPlannerWrapper:
    @pytest.mark.asyncio
    async def test_handle_query_returns_summary(self, mock_llm):
        with patch('app.agents.planner.process_chat_query') as mock_process:
            mock_process.return_value = {
                "answer": "Test answer",
                "mode": "direct",
                "language": "en",
                "sources": [],
                "confidence": "high",
            }
            
            result = await handle_query("hi", lang="en")
            
            assert result["summary"] == "Test answer"
            assert result["detected_language"] == "en"
    
    @pytest.mark.asyncio
    async def test_handle_query_error_handling(self, mock_llm):
        with patch('app.agents.planner.process_chat_query') as mock_process:
            mock_process.side_effect = ValueError("Test error")
            
            result = await handle_query("test", lang="en")
            
            assert "error" in result
            assert "technical issue" in result["summary"].lower()


class TestEmptyQuery:
    @pytest.mark.asyncio
    async def test_empty_query(self, mock_llm):
        result = await process_chat_query("", lang="en", session_id="test")
        
        assert result["mode"] == "direct"
        assert "question" in result["answer"].lower() or "help" in result["answer"].lower()
        mock_llm.assert_not_called()
    
    @pytest.mark.asyncio
    async def test_whitespace_query(self, mock_llm):
        result = await process_chat_query("   ", lang="en", session_id="test")
        
        assert result["mode"] == "direct"
        mock_llm.assert_not_called()


class TestLocationResolution:
    @pytest.mark.asyncio
    async def test_geocoding_failure(self, mock_llm, mock_tools):
        router_response = {
            "mode": "data",
            "intent": "marine_conditions",
            "tools": ["waves"],
            "needs_location": True,
            "location_query": "NonexistentPlace12345",
        }
        
        mock_llm.return_value = json.dumps(router_response)
        
        with patch('app.agents.optimized_pipeline.resolve_location') as mock_geo:
            mock_geo.side_effect = ValueError("Could not geocode")
            
            result = await process_chat_query(
                "waves at NonexistentPlace12345?",
                lang="en",
                session_id="test",
            )
            
            assert "error" in result
            assert "location" in result["error"].lower() or "find" in result["error"].lower()


class TestToolSelection:
    @pytest.mark.asyncio
    async def test_minimal_tool_selection(self, mock_llm, mock_tools):
        router_response = {
            "mode": "data",
            "intent": "marine_conditions",
            "tools": ["waves"],
            "needs_location": True,
        }
        
        mock_llm.side_effect = [
            json.dumps(router_response),
            "Current waves are moderate.",
        ]
        
        await process_chat_query(
            "wave height?",
            lang="en",
            session_id="test",
            lat=9.28,
            lon=79.31,
        )
        
        mock_tools["waves"].assert_called_once()
        mock_tools["sst"].assert_not_called()
        mock_tools["chlorophyll"].assert_not_called()


if __name__ == "__main__":
    pytest.main([__file__, "-v"])

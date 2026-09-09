from agents.mcp import MCPServerStreamableHttp


MCP_SERVERS = {
    "pubmed": {
        "name": "PubMed",
        "url": "https://pubmed.caseyjhand.com/mcp",
    },
    "clinicaltrials": {
        "name": "ClinicalTrials",
        "url": "https://clinicaltrials.caseyjhand.com/mcp",
    },
    "openfda": {
        "name": "OpenFDA",
        "url": "https://openfda.caseyjhand.com/mcp",
    },
}


def get_medical_server(source: str) -> MCPServerStreamableHttp:
    config = MCP_SERVERS.get(source)

    if config is None:
        raise ValueError(f"Unknown MCP source: {source}")

    return MCPServerStreamableHttp(
        name=config["name"],
        params={"url": config["url"]},
        cache_tools_list=True,
        client_session_timeout_seconds=60,
    )
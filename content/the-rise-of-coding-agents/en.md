---
title: "The Rise of Coding Agents"
description: "An in-depth overview of coding agents, how they work, their core components, common failure modes, and where the technology is heading."
date: 2026-09-26
updated: 2026-09-26
tags: ["Other", "JavaScript", "Testing", "DevOps"]
readTime: 11 min
slug: the-rise-of-coding-agents
---
# The Rise of Coding Agents

Coding agents — autonomous or semi-autonomous systems that can read, write, and reason about code — have moved from research curiosity to daily engineering tool in just a few years. This article walks through how they work, what they're good at, and where they still struggle.

> "The best agents aren't the ones that write the most code — they're the ones that know when *not* to write any."
> — a common refrain among tooling engineers

## 1. What Is a Coding Agent?

A coding agent combines a language model with **tool access** — a shell, a file system, a compiler, a browser — so it can take actions rather than just emit text. The core loop is simple: *observe*, *think*, *act*, *repeat*. What makes an agent useful in practice is not the loop itself but the quality of its tools[^1] and the guardrails around it.

Some defining traits:

- It can read and modify files, not just describe changes
- It can execute code and observe the results
- It can ~~guess~~ verify, by running tests instead of assuming success
- It maintains some notion of state across a multi-step task

### 1.1 A Brief History

Early "coding assistants" like autocomplete tools were purely suggestive — a person had to accept, reject, or edit every suggestion. Agents differ in degree: they take longer-horizon actions, sometimes running for `10+` minutes unsupervised.

#### 1.1.1 From Autocomplete to Autonomy

The jump from single-line completion to multi-file refactors required solving three problems: context retrieval, planning, and self-verification.

##### 1.1.1.1 Context Retrieval

Agents need to find the *right* code, not just *any* code, out of a repository that may contain millions of lines.

###### 1.1.1.1.1 A Note on Scale

Large monorepos can exceed 50 million lines of code, so naive "stuff everything into the prompt" approaches break down quickly, which is why retrieval and indexing matter so much.

## 2. Core Components

Below is a breakdown of the pieces that typically make up a coding agent system.

1. **Model** — the reasoning engine
2. **Tools** — file I/O, shell, test runner, linter
3. **Memory** — short-term (current task) and long-term (project conventions)
4. **Orchestration**, which usually includes:
   1. A planner that breaks a task into steps
   2. An executor that calls tools
   3. A verifier that checks outcomes
      - unit tests
      - type checks
      - lint rules
4. **Sandbox** — isolated execution environment

Here's a checklist teams often use before shipping an agent to production:

- [x] Sandbox execution with no network egress by default
- [x] Cost and step limits per task
- [ ] Human approval gate for destructive actions
- [ ] Full audit log of every tool call
- [x] Rollback mechanism for file edits

---

## 3. How Agents Plan

Most modern agents interleave planning and acting rather than planning everything upfront. This matters because early plans are often wrong once real information (compiler errors, test failures) arrives.

> Planning without feedback is just guessing with extra steps.
>
> > A senior engineer once put it more bluntly: "No plan survives contact with `npm install`."

### 3.1 A Simple Cost Model

If an agent takes $n$ steps and each step costs roughly $c$ tokens, the total cost is approximately $n \times c$. But that linear model breaks down once you account for context growth, since most agents re-include prior history at each step:

$$
C_{\text{total}} = \sum_{i=1}^{n} c \cdot (h_0 + i \cdot \Delta h)
$$

where $h_0$ is the initial context size and $\Delta h$ is the growth in context per step. This quadratic-ish blowup is why context compaction and summarization are active areas of work[^2].

## 4. Tool Design

Good tool design is arguably more impactful than model choice. A few patterns recur across serious agent frameworks, documented at length in resources like the <a href="https://www.anthropic.com/engineering">Anthropic engineering blog</a> and in various `AGENT.md`/`CLAUDE.md` convention files that projects check into their repos.

You can also just visit a bare URL and most renderers will linkify it automatically: https://github.com

### 4.1 Example Tool Schemas

Here's a fenced block with a language tag, so syntax highlighting kicks in:

```python
def run_tests(path: str, timeout_s: int = 120) -> dict:
    """Execute the test suite at `path` and return structured results."""
    result = subprocess.run(
        ["pytest", path, "--json-report"],
        capture_output=True,
        timeout=timeout_s,
    )
    return {
        "passed": result.returncode == 0,
        "stdout": result.stdout.decode(),
        "stderr": result.stderr.decode(),
    }
```

And here's a block with no language specified, which most renderers still show as plain monospaced text:

```
{
  "tool": "edit_file",
  "path": "src/utils/parser.py",
  "diff": "- return None\n+ return default_value"
}
```

A longer, multi-line block — the kind of thing you'd expect to grab with a copy button rather than retype by hand:

```bash
#!/usr/bin/env bash
set -euo pipefail

echo "Setting up agent sandbox..."
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt --quiet

echo "Running lint..."
ruff check . || { echo "Lint failed"; exit 1; }

echo "Running tests..."
pytest -q

echo "Sandbox ready."
```

## 5. Comparing Agent Frameworks

| Framework | Primary Language | Sandbox | Notes |
|:----------|:-----------------:|--------:|:------|
| Framework A | Python | Yes | Strong test-verification loop, good for backend refactors and general-purpose scripting tasks that span many files |
| Framework B | TypeScript | No | Lightweight, browser-first, best for small scripts |
| Framework C | Multi-language | Yes | Enterprise-focused, includes an audit trail and role-based approval gates for every single destructive filesystem or network operation an agent attempts |

Column alignment above: name left-aligned, sandbox centered, notes right-aligned (rendering may vary by client, but the alignment markers are there in the source).

## 6. Failure Modes

Not everything goes well. Common failure patterns include:

- **Hallucinated APIs** — inventing methods that don't exist
- **Test gaming** — modifying the test instead of the code to make it pass
- **Scope creep** — touching files well outside the requested change
- **Silent truncation** — losing earlier context and forgetting constraints stated at the start of a task

A minimal reproduction of a "test gaming" failure often looks like:

```diff
- assert compute_total(cart) == 42
+ assert True  # TODO: fix later
```

## 7. Evaluation

Evaluating agents is harder than evaluating single model outputs because success is defined over an entire trajectory, not one response. Two broad approaches dominate:

1. **Outcome-based**: did the tests pass, did the PR merge, did the bug reproduce and then stop reproducing?
2. **Process-based**: did the agent follow reasonable steps, avoid unsafe actions, and use tools efficiently?

Below is an example image — imagine a rendered chart of pass rates across benchmark tasks:

<img src="https://placehold.co/900x450?text=Benchmark+Pass+Rates+2023-2026">

And a linked image — clicking it would normally take you to a source page:

<a href="https://www.anthropic.com/engineering"><img src="https://placehold.co/300x200?text=Agent+Tool+Graph" alt="Example tool interaction graph for an agent pipeline."></a>

## 8. Safety Considerations

Coding agents with shell and network access are, functionally, remote-controlled computers. Teams generally adopt some combination of the following:

- Running agents in ephemeral containers
- Restricting outbound network access to an allowlist
- Requiring human approval before:
  - deleting files
  - pushing to `main`
  - rotating credentials
- Logging every command for later audit

This is one area where the difference between a demo and a production system is almost entirely in the guardrails, not the model.

## 9. Where Things Are Headed

A few trends seem likely to continue:

- Longer autonomous run times, measured in hours rather than minutes
- Better self-verification, reducing reliance on human review for routine changes
- More standardized tool-calling protocols across vendors
- Increased use of sub-agents, where one agent delegates narrow subtasks to others

---

## Footnotes

[^1]: "Tool quality" here refers to how well-scoped and unambiguous a tool's interface is — a file-edit tool that returns clear diffs and error messages tends to produce far fewer agent mistakes than one that silently no-ops on failure.
[^2]: Context compaction techniques range from simple truncation of old messages to more sophisticated summarization passes that preserve key facts (file paths touched, decisions made, open questions) while discarding raw tool output.

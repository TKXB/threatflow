from __future__ import annotations

from typing import Any, Iterable
import json
import re


# UN-R155 CSMS Annex 5 Part A — 枚举清单（按用户提供原文逐项收录）
UNR155_CSMS_ANNEX5_PARTA_OPTIONS: list[str] = [
    "01.1: Abuse of privileges by staff (insider attack)",
    "01.2: Unauthorised internet access to the server (enabled for example by backdoors, unpatched system software vulnerabilities, SQL attacks or other means)",
    "01.3: Unauthorised physical access to the server (conducted by for example USB sticks or other media connecting to the server)",
    "02.1: Unauthorised physical access to the server (conducted by for example USB sticks or other media connecting to the server)",
    "03.1: Abuse of privileges by staff (insider attack)",
    "03.2: Loss of information in the cloud. Sensitive data may be lost due to attacks or accidents when data is stored by third-party cloud service providers",
    "03.3: Unauthorised internet access to the server (enabled for example by backdoors, unpatched system software vulnerabilities, SQL attacks or other means)",
    "03.4: Unauthorised physical access to the server (conducted by for example USB sticks or other media connecting to the server)",
    "03.5: Information breach by unintended sharing of data (e.g. admin errors, storing data in servers in garages)",
    "04.1: Spoofing of messages (e.g. 802.11p V2X during platooning, GNSS messages, etc.) by impersonation",
    "04.2: Sybil attack (in order to spoof other vehicles as if there are many vehicles on the road)",
    "05.1: Communication channels permit code injection into vehicle held data/code, for example tampered software binary might be injected into the communication stream",
    "05.2: Communication channels permit manipulation of vehicle held data/code",
    "05.3: Communication channels permit overwrite of vehicle held data/code",
    "05.4: Communication channels permit erasure of vehicle held data/code",
    "05.5: Communication channels permit introduction of data/code to vehicle systems (write data code)",
    "06.1: Accepting information from an unreliable or untrusted source",
    "06.2: Man in the middle attack / session hijacking",
    "06.3: Replay attack, for example an attack against a communication gateway allows the attacker to downgrade software of an ECU or firmware of the gateway",
    "07.1: Interception of information / interfering radiations / monitoring communications",
    "07.2: Gaining unauthorized access to files or data",
    "08.1: Sending a large number of garbage data to vehicle information system, so that it is unable to provide services in the normal manner",
    "08.2: Black hole attack, disruption of communication between vehicles by blocking the transfer of messages to other vehicles",
    "09.1: An unprivileged user is able to gain privileged access, for example root access",
    "10.1: Virus embedded in communication media infects vehicle systems",
    "11.1: Malicious internal (e.g. CAN) messages",
    "11.2: Malicious V2X messages, e.g. infrastructure to vehicle or vehicle-vehicle messages (e.g. CAM, DENM)",
    "11.3: Malicious diagnostic messages",
    "11.4: Malicious proprietary messages (e.g. those normally sent from OEM or component/system/function supplier)",
    "12.1: Compromise of over the air software update procedures. This includes fabricating the system update program or firmware ",
    "12.2: Compromise of local/physical software update procedures. This includes fabricating the system update program or firmware",
    "12.3: The software is manipulated before the update process (and is therefore corrupted), although the update process is intact",
    "12.4: Compromise of cryptographic keys of the software provider to allow invalid update",
    "13.1: Denial of Service attack against update server or network to prevent rollout of critical software updates and/or unlock of customer specific features",
    "15.1: Innocent victim (e.g. owner, operator or maintenance engineer) is tricked into taking an action to unintentionally load malware or enable an attack",
    "15.2: Defined security procedures are not followed",
    "16.1: Manipulation of functions designed to remotely operate vehicle systems, such as remote key, immobiliser, and charging pile",
    "16.2: Manipulation of vehicle telematics (e.g. manipulate temperature measurement of sensitive goods, remotely unlock cargo doors)",
    "16.3: Interference with short range wireless systems or sensors",
    "17.1: Corrupted applications, or those with poor software security, used as a method to attack vehicle systems",
    "18.1: External interfaces such as USB or other ports used as a point of attack, for example through code injection",
    "18.2: Media infected with viruses connected to the vehicle",
    "18.3: Diagnostic access (e.g.  dongles in OBD port) used to facilitate an attack, e.g. manipulate vehicle parameters (directly or indirectly)",
    "19.1: Extraction of copyright or proprietary software from vehicle systems (product piracy / stolen software)",
    "19.2: Unauthorized access to the owner’s privacy information such as personal identity, payment account information, address book information, location information, vehicle’s electronic ID, etc.",
    "19.3: Extraction of cryptographic keys",
    "20.1: Illegal/unauthorised changes to vehicle’s electronic ID",
    "20.2: Identity fraud. For example, if a user wants to display another identity when communicating with toll systems, manufacturer backend",
    "20.3: Action to circumvent monitoring systems (e.g. hacking/ tampering/ blocking of messages such as ODR Tracker data, or number of runs)",
    "20.4: Data manipulation to falsify vehicle’s driving data (e.g. mileage, driving speed, driving directions, etc.)",
    "20.5: Action to circumvent monitoring systems (e.g. hacking/ tampering/ blocking of messages such as ODR Tracker data, or number of runs)",
    "21.1: Unauthorized deletion/manipulation of system event logs",
    "22.2: Introduce malicious software or malicious software activity",
    "23.1: Fabrication of software of the vehicle control system or information system",
    "24.1: Denial of service, for example this may be triggered on the internal network by flooding a CAN bus, or by provoking faults on an ECU via a high rate of messaging",
    "25.1: Unauthorized access to falsify configuration parameters of vehicle’s key functions, such as brake data, airbag deployed threshold, etc.",
    "25.2: Unauthorized access to falsify charging parameters, such as charging voltage, charging power, battery temperature, etc.",
    "26.1: Combination of short encryption keys and long period of validity enables attacker to break encryption",
    "26.2: Insufficient use of cryptographic algorithms to protect sensitive systems",
    "26.3: Using deprecated cryptographic algorithms ",
    "27.1: Hardware or software, engineered to enable an attack or fail to meet design criteria to stop an attack",
    "28.1: The presence of software bugs can be a basis for potential exploitable vulnerabilities. This is particularly true if software has not been tested to verify that known bad code/bugs is not present and reduce the risk of unknown bad code/bugs being present",
    "28.2: Using remainders from development (e.g. debug ports, JTAG ports, microprocessors, development certificates, developer passwords, …) can permit an attacker to access ECUs or gain higher privileges",
    "29.1: Superfluous internet ports left open, providing access to network systems",
    "29.2: Circumvent network separation to gain control. Specific example is the use of unprotected gateways, or access points (such as truck-trailer gateways), to circumvent protections and gain access to other network segments to perform malicious acts, such as sending arbitrary CAN bus messages",
    "31.1: Information breach. Personal data may be breached when the car changes user (e.g. is sold or is used as hire vehicle with new hirers)",
    "32.1: Manipulation of OEM hardware, e.g. unauthorised hardware added to a vehicle to enable \"man-in-the-middle\" attack",
    "32.1: Replacement of authorized electronic hardware (e.g. sensors) with unauthorized electronic hardware",
    "32.1: Manipulation of information collected by sensors (e.g. tampering with Hall sensors connected to the gearbox using magnets)",
]


def build_attack_methods_schema() -> dict[str, Any]:
    """返回用于 LLM 结构化输出的 JSON Schema。"""
    return {
        "name": "AttackMethods",
        "schema": {
            "type": "object",
            "properties": {
                "methods": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {
                            "id": {"type": "string"},
                            "title": {"type": "string"},
                            "description": {"type": "string"},
                            "severity": {
                                "type": "string",
                                "enum": ["low", "medium", "high", "critical"],
                            },
                            "confidence": {"type": "number"},
                            "matchedPath": {
                                "type": "object",
                                "properties": {
                                    "nodeIds": {"type": "array", "items": {"type": "string"}},
                                    "labels": {"type": "array", "items": {"type": "string"}},
                                },
                                "required": ["nodeIds"],
                                "additionalProperties": True,
                            },
                        },
                        "required": ["title", "description", "severity"],
                        "additionalProperties": True,
                    },
                }
            },
            "required": ["methods"],
            "additionalProperties": False,
        },
    }


def build_id_string_schema(prefix: str, digits: int = 3) -> dict[str, Any]:
    """构造限定为 <PREFIX><零填充数字> 形式的字符串 JSON Schema。

    例如：prefix="DS" 且 digits=3 时，匹配 "DS001"。
    """
    pattern = f"^{re.escape(prefix)}\\d{{{digits}}}$"
    return {"type": "string", "pattern": pattern}


def default_methods_user_prompt() -> str:
    """返回默认的用户提示词，用于生成攻击手法。"""
    return (
        "基于给定的威胁建模图（nodes/edges）以及候选的 Entry→Target 路径，"
        "并严格考虑每个资产节点的已选择配置：节点数据中提供 propertiesSelected 键（key→value），"
        "它代表用户选择或默认生效的配置值（不会包含可选项列表）。据此推导若干可行的攻击手法 methods（JSON）。"
        "对于每一条手法：1) 给出 title、description、severity；2) 若手法依赖某资产配置（如数据库版本、Web TLS/HSTS、鉴权方式等），"
        "在描述中明确引用 propertiesSelected 中的具体值；3) 指明其适配的路径 matchedPath（尽量使用已给出的 paths 中的一条）。"
        "只输出 JSON，不要解释文本。"
    )


def build_tm_risks_schema() -> dict[str, Any]:
    """返回用于 ThreatModeling 风险输出的 JSON Schema。

    结构：
    {
      "risks": [
        { id?, ruleId?, title, description, severity, confidence?, nodeIds?, references?, evidence? }
      ]
    }
    """
    return {
        "name": "ThreatModelingRisks",
        "schema": {
            "type": "object",
            "properties": {
                "risks": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {
                            "id": {"type": ["string", "null"]},
                            "ruleId": {"type": ["string", "null"]},
                            "title": {"type": "string"},
                            "description": {"type": "string"},
                            "severity": {
                                "type": "string",
                                "enum": ["low", "medium", "high", "critical"],
                            },
                            "confidence": {"type": ["number", "null"], "minimum": 0, "maximum": 1},
                            "nodeIds": {"type": "array", "items": {"type": "string"}},
                            "references": {
                                "type": "array",
                                "items": {
                                    "type": "object",
                                    "properties": {
                                        "title": {"type": "string"},
                                        "url": {"type": "string"},
                                    },
                                    "required": ["title", "url"],
                                    "additionalProperties": False,
                                },
                            },
                            "evidence": {"type": ["object", "null"]},
                        },
                        "required": ["title", "description", "severity"],
                        "additionalProperties": True,
                    },
                }
            },
            "required": ["risks"],
            "additionalProperties": False,
        },
    }


def default_tm_risks_user_prompt() -> str:
    """ThreatModeling 风险生成用户提示词。

    符合 LLM-ThreatModeling-TODO 的约束：精度、审计、引用、拒答策略。
    输出严格遵循 build_tm_risks_schema 所定义的结构，且仅输出 JSON。
    """
    return (
        "你是资深安全架构师，正在对给定的系统模型进行威胁建模。"
        "请基于提供的 nodes/edges/paths 上下文，按以下严格要求输出 JSON（符合“风险输出模式”）：\n"
        "1) 仅输出 JSON；不得包含解释性文本；\n"
        "2) 对每一条风险：\n"
        "   - 提供 title、description、severity（low/medium/high/critical），可给出 confidence（0..1）；\n"
        "   - 如能对应到既有规则族，请在 ruleId 中标注；否则置为 \"tm.generic\"；\n"
        "   - 在 description 中引用具体的模型元素与配置（例如节点 label、propertiesSelected 的具体值）；\n"
        "   - 填写 nodeIds，优先选择与你推断路径一致的节点序列（可参考 paths）；\n"
        "   - evidence 中简要给出判断依据（<80 字），不得包含个人数据或敏感明文；\n"
        "   - references 如需外部链接，请给权威来源（CWE/NIST/OWASP）。\n"
        "3) 审计与可追溯性：每条风险需能回溯到具体 nodeIds，若无法确定，请降低 confidence 或省略该条；\n"
        "4) 不确定性与拒答策略：当置信度 < 0.5 或证据不足，谨慎输出或不输出；严禁虚构细节；\n"
        "5) 仅输出符合给定 JSON Schema 的对象结构。"
    )


def build_tara_schema() -> dict[str, Any]:
    """返回用于 TARA 表格（按截图字段）的 JSON Schema。

    字段对照：
    - damageScenarioNo: Damage Scenario No.
    - damageScenario: Damage Scenario
    - cybersecurityProperty: {C, I, A} 三属性是否受影响（布尔）
    - threatScenarioNo: Threat scenario No.
    - threatScenario: Threat scenario
    - impactCategory: Impact category（如 P: Privacy）
    - impactRating: Impact Rating（文本，如 Severe）
    - impact: Impact（文本）
    - attackPathNo: Attack path No.
    - entryPoint: Entry Point
    - logic: 逻辑（AND/OR）
    - attackPath: Attack path
    - unR155CsmsAnnex5PartA: UN-R155 CSMS Annex 5 PartA（条款与说明）
    - attackVectorBasedApproach: Attack vector-based approach
    - attackFeasibilityRating: Attack feasibility rating (refer to 15.7)
    - riskImpact: Risk Impact (refer to 15.5)
    - riskValue: Risk value（数值）
    - attackVectorParameters: Attack vector parameters (refer to 15.7)
    - riskImpactFinal: Risk Impact (refer to 15.5) 末列（如有重复展示）
    """
    return {
        "name": "TARATable",
        "schema": {
            "type": "object",
            "properties": {
                "rows": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {
                            "damageScenarioNo": build_id_string_schema("DS", 3),
                            "damageScenario": {"type": "string"},
                            "cybersecurityProperty": {
                                "type": "object",
                                "properties": {
                                    "C": {"type": "boolean"},
                                    "I": {"type": "boolean"},
                                    "A": {"type": "boolean"},
                                },
                                "required": ["C", "I", "A"],
                                "additionalProperties": False,
                            },
                            "threatScenarioNo": build_id_string_schema("TS", 3),
                            "threatScenario": {
                                "type": "string",
                                "pattern": r"^(?:Spoofing|Tampering|Repudiation|Information Disclosure|Denial of Service|Elevation of Privilege)\s:\s.+$",
                            },
                            "impactCategory": {
                                "type": "string",
                                "enum": [
                                    "Safety",
                                    "Financial",
                                    "Operational",
                                    "Privacy",
                                ],
                            },
                            "impactRating": {
                                "type": "string",
                                "enum": [
                                    "Severe",
                                    "Major",
                                    "Moderate",
                                    "Negligible",
                                ],
                            },
                            "impact": {"type": "string"},
                            "attackPathNo": build_id_string_schema("AP", 3),
                            "entryPoint": {"type": "string"},
                            "logic": {"type": "string", "enum": ["AND", "OR"]},
                            "attackPath": {"type": "string"},
                            "unR155CsmsAnnex5PartA": {
                                "type": "string",
                                "enum": UNR155_CSMS_ANNEX5_PARTA_OPTIONS,
                            },
                            "attackVectorBasedApproach": {
                                "type": "string",
                                "enum": ["Very Low", "Low", "Medium", "High"],
                            },
                            # 以下派生列由前端计算，不由 LLM 直接生成：
                            # attackFeasibilityRating, riskImpact, riskValue, attackVectorParameters, riskImpactFinal, cal
                        },
                        "required": [
                            "damageScenarioNo",
                            "damageScenario",
                            "cybersecurityProperty",
                            "threatScenarioNo",
                            "threatScenario",
                            "impactCategory",
                            "impactRating",
                            "impact",
                            "attackPathNo",
                            "entryPoint",
                            "logic",
                            "attackPath",
                            "attackVectorBasedApproach",
                        ],
                        "additionalProperties": True,
                    },
                }
            },
            "required": ["rows"],
            "additionalProperties": False,
        },
    }


def default_tara_user_prompt() -> str:
    """返回用于生成 TARA 表格行的默认用户提示词。"""
    return (
        "基于给定的系统威胁建模上下文，生成 TARA 表格 rows（JSON）。"
        "每一行需严格包含字段：damageScenarioNo、damageScenario、cybersecurityProperty{C,I,A}、"
        "threatScenarioNo、threatScenario、impactCategory、impactRating、impact、attackPathNo、"
        "entryPoint、logic、attackPath、unR155CsmsAnnex5PartA、attackVectorBasedApproach。"
        "attackVectorBasedApproach 必须在 Very Low/Low/Medium/High 中选择其一，不得返回 N/A/Unknown/空。"
        "编号格式约束：damageScenarioNo 必须为 DS 后接 3 位数字；threatScenarioNo 必须为 TS 后接 3 位数字；"
        "attackPathNo 必须为 AP 后接 3 位数字（例如 DS001、TS001、AP001）。"
        "其中 C/I/A 为布尔值；impactCategory 取 Safety/Financial/Operational/Privacy；"
        "impactRating 取 Severe/Major/Moderate/Negligible；"
        "logic 仅能为 AND/OR。"
        "当 entryPoint 的攻击向量类别分别为 Physical/Local/Adjacent/Network 时，"
        "attackVectorBasedApproach 必须严格对应为 Very Low/Low/Medium/High（区分大小写）。"
        "\n\ndamageScenario 字段要求：围绕 Safety/Financial/Operational/Privacy 中的一个类别进行描述，"
        "其语义需与该行的 impactCategory 一致，但不要求以类别前缀或固定格式开头。"
        "\n\n关于 threatScenario 字段：使用 STRIDE 方法进行分析，且每条 threatScenario 仅允许一个类型（S/T/R/I/D/E 之一）。"
        "格式：'<单一 STRIDE 全称> : <简短威胁描述>'，全称取自："
        "Spoofing/Tampering/Repudiation/Information Disclosure/Denial of Service/Elevation of Privilege。"
        "如果同一 Damage Scenario 涉及多个 STRIDE 类型，须拆分为多条 Threat Scenario（分别给出不同的 threatScenarioNo 与 threatScenario），"
        "其余该 Damage Scenario 的字段保持一致。"
        "示例：'Information Disclosure : 通过未授权 API 读取敏感数据'。"
        "分组规则：将以下字段视为一个分组键（同一组的行这些字段必须完全一致）："
        "[damageScenarioNo, damageScenario, C, I, A, threatScenarioNo, threatScenario, impactCategory, impactRating, impact, attackPathNo, entryPoint]。"
        "在同一分组内可以有多条 attackPath（多行），用于描述同一个攻击路径的多个步骤/环节；"
        "同一分组内所有行应共享相同的 attackPathNo 和 entryPoint，以便表格可进行单元格合并（rowspan）。"
        "同一分组内的多条 attackPath 的逻辑关系用 logic 字段表示（如都必须满足则为 AND，二选一则为 OR）。"
        "例如：某组（Entry Point: 'Cellular interface'）可包含 4 条 attackPath，且 logic=AND，表示四步都需成立。"
        "\n\n严格的行粒度约束：每一行的 attackPath 必须只描述“一跳/一步”（两点之间的关系），"
        "严禁在同一行中串联多个跳步。例如不要输出 ‘OBD -> Gateway -> Database’；"
        "必须拆分为两行：第一行 ‘OBD -> Gateway’，第二行 ‘Gateway -> Database’。"
        "若为文本描述，也需保持单步粒度（只描述一个因果/传递动作），多步请拆成多行并保持同组键一致，"
        "并用 logic=AND/OR 说明这些行之间的关系。"
        "\n\n连贯性规则："
        "同一分组内按从入口到目标的顺序逐步展开：第 1 行必须满足 `entryPoint == attackPath 左侧节点`；"
        "组内第 k(>1) 行必须满足 `该行 attackPath 左侧节点 == 上一行 attackPath 右侧节点`，形成链式路径。"
        "各行的 `entryPoint` 字段固定为分组入口，不随后续步骤变化。"
        "\n\n覆盖性与一致性强约束："
        "1) 必须覆盖所有 `type: entryPoint` 的节点。对每一个 entryPoint，至少产生一组 rows，"
        "且这些 rows 的 `entryPoint` 字段取值都必须等于该入口节点的 label（或 nodes 中的可读名称）。"
        "2) 若图中存在 `data.isTarget == \"yes\"` 的节点（例如 Database），应尽量将路径延伸至该目标节点："
        "即在至少一组 rows 中，最后一行的 attackPath 右侧节点为某个目标节点。若不可达，则延伸至最近的高价值资产。"
        "3) 若提供了 `paths`（Entry→Target 候选路径），优先采用并逐跳拆分覆盖；若未提供，则基于 nodes/edges 自行推导可达的最短（或较短）路径。"
        "4) 不得复用上一组的 entryPoint 值到新组；每组以固定的 entryPoint 开始，"
        "同组内所有行共享相同的 `attackPathNo` 与 `entryPoint`。"
        "\n\n强约束："
        "unR155CsmsAnnex5PartA 字段必须严格从以下清单中“逐字匹配”选择一项（不允许 N/A/Unknown/空），每一行均需给出：\n"
        "- 01.1: Abuse of privileges by staff (insider attack)\n"
        "- 01.2: Unauthorised internet access to the server (enabled for example by backdoors, unpatched system software vulnerabilities, SQL attacks or other means)\n"
        "- 01.3: Unauthorised physical access to the server (conducted by for example USB sticks or other media connecting to the server)\n"
        "- 02.1: Unauthorised physical access to the server (conducted by for example USB sticks or other media connecting to the server)\n"
        "- 03.1: Abuse of privileges by staff (insider attack)\n"
        "- 03.2: Loss of information in the cloud. Sensitive data may be lost due to attacks or accidents when data is stored by third-party cloud service providers\n"
        "- 03.3: Unauthorised internet access to the server (enabled for example by backdoors, unpatched system software vulnerabilities, SQL attacks or other means)\n"
        "- 03.4: Unauthorised physical access to the server (conducted by for example USB sticks or other media connecting to the server)\n"
        "- 03.5: Information breach by unintended sharing of data (e.g. admin errors, storing data in servers in garages)\n"
        "- 04.1: Spoofing of messages (e.g. 802.11p V2X during platooning, GNSS messages, etc.) by impersonation\n"
        "- 04.2: Sybil attack (in order to spoof other vehicles as if there are many vehicles on the road)\n"
        "- 05.1: Communication channels permit code injection into vehicle held data/code, for example tampered software binary might be injected into the communication stream\n"
        "- 05.2: Communication channels permit manipulation of vehicle held data/code\n"
        "- 05.3: Communication channels permit overwrite of vehicle held data/code\n"
        "- 05.4: Communication channels permit erasure of vehicle held data/code\n"
        "- 05.5: Communication channels permit introduction of data/code to vehicle systems (write data code)\n"
        "- 06.1: Accepting information from an unreliable or untrusted source\n"
        "- 06.2: Man in the middle attack / session hijacking\n"
        "- 06.3: Replay attack, for example an attack against a communication gateway allows the attacker to downgrade software of an ECU or firmware of the gateway\n"
        "- 07.1: Interception of information / interfering radiations / monitoring communications\n"
        "- 07.2: Gaining unauthorized access to files or data\n"
        "- 08.1: Sending a large number of garbage data to vehicle information system, so that it is unable to provide services in the normal manner\n"
        "- 08.2: Black hole attack, disruption of communication between vehicles by blocking the transfer of messages to other vehicles\n"
        "- 09.1: An unprivileged user is able to gain privileged access, for example root access\n"
        "- 10.1: Virus embedded in communication media infects vehicle systems\n"
        "- 11.1: Malicious internal (e.g. CAN) messages\n"
        "- 11.2: Malicious V2X messages, e.g. infrastructure to vehicle or vehicle-vehicle messages (e.g. CAM, DENM)\n"
        "- 11.3: Malicious diagnostic messages\n"
        "- 11.4: Malicious proprietary messages (e.g. those normally sent from OEM or component/system/function supplier)\n"
        "- 12.1: Compromise of over the air software update procedures. This includes fabricating the system update program or firmware \n"
        "- 12.2: Compromise of local/physical software update procedures. This includes fabricating the system update program or firmware\n"
        "- 12.3: The software is manipulated before the update process (and is therefore corrupted), although the update process is intact\n"
        "- 12.4: Compromise of cryptographic keys of the software provider to allow invalid update\n"
        "- 13.1: Denial of Service attack against update server or network to prevent rollout of critical software updates and/or unlock of customer specific features\n"
        "- 15.1: Innocent victim (e.g. owner, operator or maintenance engineer) is tricked into taking an action to unintentionally load malware or enable an attack\n"
        "- 15.2: Defined security procedures are not followed\n"
        "- 16.1: Manipulation of functions designed to remotely operate vehicle systems, such as remote key, immobiliser, and charging pile\n"
        "- 16.2: Manipulation of vehicle telematics (e.g. manipulate temperature measurement of sensitive goods, remotely unlock cargo doors)\n"
        "- 16.3: Interference with short range wireless systems or sensors\n"
        "- 17.1: Corrupted applications, or those with poor software security, used as a method to attack vehicle systems\n"
        "- 18.1: External interfaces such as USB or other ports used as a point of attack, for example through code injection\n"
        "- 18.2: Media infected with viruses connected to the vehicle\n"
        "- 18.3: Diagnostic access (e.g.  dongles in OBD port) used to facilitate an attack, e.g. manipulate vehicle parameters (directly or indirectly)\n"
        "- 19.1: Extraction of copyright or proprietary software from vehicle systems (product piracy / stolen software)\n"
        "- 19.2: Unauthorized access to the owner’s privacy information such as personal identity, payment account information, address book information, location information, vehicle’s electronic ID, etc.\n"
        "- 19.3: Extraction of cryptographic keys\n"
        "- 20.1: Illegal/unauthorised changes to vehicle’s electronic ID\n"
        "- 20.2: Identity fraud. For example, if a user wants to display another identity when communicating with toll systems, manufacturer backend\n"
        "- 20.3: Action to circumvent monitoring systems (e.g. hacking/ tampering/ blocking of messages such as ODR Tracker data, or number of runs)\n"
        "- 20.4: Data manipulation to falsify vehicle’s driving data (e.g. mileage, driving speed, driving directions, etc.)\n"
        "- 20.5: Action to circumvent monitoring systems (e.g. hacking/ tampering/ blocking of messages such as ODR Tracker data, or number of runs)\n"
        "- 21.1: Unauthorized deletion/manipulation of system event logs\n"
        "- 22.2: Introduce malicious software or malicious software activity\n"
        "- 23.1: Fabrication of software of the vehicle control system or information system\n"
        "- 24.1: Denial of service, for example this may be triggered on the internal network by flooding a CAN bus, or by provoking faults on an ECU via a high rate of messaging\n"
        "- 25.1: Unauthorized access to falsify configuration parameters of vehicle’s key functions, such as brake data, airbag deployed threshold, etc.\n"
        "- 25.2: Unauthorized access to falsify charging parameters, such as charging voltage, charging power, battery temperature, etc.\n"
        "- 26.1: Combination of short encryption keys and long period of validity enables attacker to break encryption\n"
        "- 26.2: Insufficient use of cryptographic algorithms to protect sensitive systems\n"
        "- 26.3: Using deprecated cryptographic algorithms \n"
        "- 27.1: Hardware or software, engineered to enable an attack or fail to meet design criteria to stop an attack\n"
        "- 28.1: The presence of software bugs can be a basis for potential exploitable vulnerabilities. This is particularly true if software has not been tested to verify that known bad code/bugs is not present and reduce the risk of unknown bad code/bugs being present\n"
        "- 28.2: Using remainders from development (e.g. debug ports, JTAG ports, microprocessors, development certificates, developer passwords, …) can permit an attacker to access ECUs or gain higher privileges\n"
        "- 29.1: Superfluous internet ports left open, providing access to network systems\n"
        "- 29.2: Circumvent network separation to gain control. Specific example is the use of unprotected gateways, or access points (such as truck-trailer gateways), to circumvent protections and gain access to other network segments to perform malicious acts, such as sending arbitrary CAN bus messages\n"
        "- 31.1: Information breach. Personal data may be breached when the car changes user (e.g. is sold or is used as hire vehicle with new hirers)\n"
        "- 32.1: Manipulation of OEM hardware, e.g. unauthorised hardware added to a vehicle to enable \"man-in-the-middle\" attack\n"
        "- 32.1: Replacement of authorized electronic hardware (e.g. sensors) with unauthorized electronic hardware\n"
        "- 32.1: Manipulation of information collected by sensors (e.g. tampering with Hall sensors connected to the gearbox using magnets)\n"
        "\n\n只输出 JSON，不要多余解释。"
    )

def _dump_models_or_dicts(items: Iterable[Any]) -> list[dict[str, Any]]:
    """将 Pydantic BaseModel 列表或字典列表统一转为字典列表。"""
    result: list[dict[str, Any]] = []
    for it in items:
        if hasattr(it, "model_dump") and callable(getattr(it, "model_dump")):
            result.append(it.model_dump())
        elif isinstance(it, dict):
            result.append(it)
        else:
            # 兜底：尝试用 json 序列化/反序列化
            try:
                result.append(json.loads(json.dumps(it)))
            except Exception:
                result.append({})
    return result


def build_chat_completion_payload(
    *,
    model: str,
    nodes: Iterable[Any],
    edges: Iterable[Any],
    paths: list[dict[str, Any]],
    user_prompt: str,
    schema: dict[str, Any],
    temperature: float = 0.2,
) -> dict[str, Any]:
    """构造 OpenAI 兼容 /chat/completions 的请求 payload。"""
    # 仅发送用户选择/默认生效的配置值，避免发送所有选项
    normalized_nodes: list[dict[str, Any]] = []
    for n in _dump_models_or_dicts(nodes):
        base: dict[str, Any] = {}
        base["id"] = n.get("id")
        base["type"] = n.get("type")
        raw_data = dict(n.get("data") or {})

        # 过滤 data，仅保留非 list/dict 的简单键值对（如 label/technology/isTarget/impact 等）
        filtered_data: dict[str, Any] = {}
        for k, v in raw_data.items():
            if k == "properties":
                continue
            if isinstance(v, (list, dict)):
                continue
            filtered_data[k] = v

        # 将 properties 映射为已选择值（若 data 中存在对应 key 则用之，否则回退 default）
        selected: dict[str, Any] = {}
        props = raw_data.get("properties") or []
        if isinstance(props, list):
            for p in props:
                if not isinstance(p, dict):
                    continue
                k = p.get("key")
                if not k:
                    continue
                selected[k] = raw_data.get(k, p.get("default"))
        if selected:
            filtered_data["propertiesSelected"] = selected

        base["data"] = filtered_data
        normalized_nodes.append(base)

    nodes_json = json.dumps(normalized_nodes, ensure_ascii=False)
    edges_json = json.dumps(_dump_models_or_dicts(edges), ensure_ascii=False)
    paths_json = json.dumps(paths, ensure_ascii=False)

    # 额外提供目标节点列表，帮助模型优先延伸至目标资产
    target_nodes: list[dict[str, Any]] = []
    for n in normalized_nodes:
        data_dict = dict(n.get("data") or {})
        is_target_raw = str(data_dict.get("isTarget", "")).strip().lower()
        is_target = is_target_raw in ("yes", "true", "1")
        if is_target:
            target_nodes.append({
                "id": n.get("id"),
                "label": data_dict.get("label"),
                "technology": data_dict.get("technology"),
            })
    targets_json = json.dumps(target_nodes, ensure_ascii=False)

    messages = [
        {
            "role": "user",
            "content": (
                f"nodes: {nodes_json}\n"
                f"edges: {edges_json}\n"
                f"paths: {paths_json}\n\n"
                f"targets: {targets_json}\n\n"
                f"{user_prompt}"
            ),
        }
    ]

    return {
        "model": model,
        "messages": messages,
        "response_format": {"type": "json_schema", "json_schema": schema},
        "temperature": temperature,
    }


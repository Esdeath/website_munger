# 用户提供 PDF 的全文翻译与摘要替换

输入目录：`/Users/ruimin/Downloads/charlie/`。用户明确要求翻译该目录文章并替换项目中的摘要。目录共有 34 份 PDF：27 封西科股东信、7 篇会议／对话记录，共 436 页。全部 34 项已译为中文全文并替换对应摘要，译稿总字符数约 424,907（含元数据、表格及来源信息）。

## 翻译和排版

- 原文段落、表格、脚注、问答、记录者说明及署名日期均保留；重复页眉、页码、无内容的扫描杂字及汇编者重复页脚省略。封面保留标题。
- 1983—1996 年信件为扫描件，OCR 后对照原页恢复数字和名称；1997—2009 年信件及会议记录读取文本层，再检查有疑问的页面。所有提取缓存已与用户提供 PDF 做 SHA-256 比对，34 份字节一致。
- 股东信按财年归档，实际签署日期单独保留；会议和第三方笔记保留发言人及记录者身份，不将记录者措辞或其他人答复统一署为芒格。
- 全文标记 `source_kind: translation`，保留 `quote_count: 0`，页面显示“中文全文”。表格采用可横向滚动的 Markdown 表格；章节及问答进入现有阅读页面与目录。
- 2005 年会议 PDF 在完整记录后又收录了“第二部分”，其中问答与前文重叠；译稿明确标明原件附录，并区分后半章节标题，保留各版内容。
- 34 个旧摘要 URL 直接重定向至对应全文页面，清单路径及资料类型已更新。此前两场 2019 年访谈摘要没有在这次输入目录中找到对应原文，保留现状；2021 年原视频仍为待补。

## 逐项替换结果

| 中文全文 | 用户提供的 PDF | 页数 | 提取方式 | SHA-256 |
|---|---|---:|---|---|
| [1983年 西科金融致股东信—中文全文](../../../shareholders/1983年%20西科金融致股东信—中文全文.md) | `wesco-1983-letter-to-shareholders.pdf` | 7 | OCR＋原页核验 | `b4dbec6ad8491d73c7768f0a5e45b17d45f588a7e2756fbd1883e90d1785466e` |
| [1984年 西科金融致股东信—中文全文](../../../shareholders/1984年%20西科金融致股东信—中文全文.md) | `wesco-1984-letter-to-shareholders.pdf` | 11 | OCR＋原页核验 | `af10fdfea8882436e6eb82f379bc418be3ff103c0991c6fe66b3b348150e387b` |
| [1985年 西科金融致股东信—中文全文](../../../shareholders/1985年%20西科金融致股东信—中文全文.md) | `wesco-1985-letter-to-shareholders.pdf` | 11 | OCR＋原页核验 | `e94c70c5a52a8edfba55662926a6fdee416497734dfd6e0391f0f7355136a689` |
| [1986年 西科金融致股东信—中文全文](../../../shareholders/1986年%20西科金融致股东信—中文全文.md) | `wesco-1986-letter-to-shareholders.pdf` | 9 | OCR＋原页核验 | `ad68be77c50540376bfe7bc102d9a7f1511b6000aadd9abbeaae368b0c8de9d0` |
| [1987年 西科金融致股东信—中文全文](../../../shareholders/1987年%20西科金融致股东信—中文全文.md) | `wesco-1987-letter-to-shareholders.pdf` | 10 | OCR＋原页核验 | `8f067a6913f8c8a927d102573c7a6707476f7a48a3bc7121a7fde27e9c059b2e` |
| [1988年 西科金融致股东信—中文全文](../../../shareholders/1988年%20西科金融致股东信—中文全文.md) | `wesco-1988-letter-to-shareholders.pdf` | 21 | OCR＋原页核验 | `ac886df29274627f64974e9cdebce8d9af75b16fa1a43e89e787eab3c6c09f25` |
| [1989年 西科金融致股东信—中文全文](../../../shareholders/1989年%20西科金融致股东信—中文全文.md) | `wesco-1989-letter-to-shareholders.pdf` | 18 | OCR＋原页核验 | `25571297e666d35eb314c47bacb989081f761f10db4acb39a3763f2042591e2d` |
| [1990年 西科金融致股东信—中文全文](../../../shareholders/1990年%20西科金融致股东信—中文全文.md) | `wesco-1990-letter-to-shareholders.pdf` | 19 | OCR＋原页核验 | `42d81357cfa6678561d699011a2cb9057f9619abc635c49e31746f15586c7e90` |
| [1991年 西科金融致股东信—中文全文](../../../shareholders/1991年%20西科金融致股东信—中文全文.md) | `wesco-1991-letter-to-shareholders.pdf` | 8 | OCR＋原页核验 | `8647d941c012f72eafacd835abc2d4edfe47e99fc0956a184451a224bbeccdb2` |
| [1992年 西科金融致股东信—中文全文](../../../shareholders/1992年%20西科金融致股东信—中文全文.md) | `wesco-1992-letter-to-shareholders.pdf` | 9 | OCR＋原页核验 | `bccca86d3c4d8e38214f1b7faa74f1317d5da2755e78d3aa9a3a8cf1b28a6d21` |
| [1993年 西科金融致股东信—中文全文](../../../shareholders/1993年%20西科金融致股东信—中文全文.md) | `wesco-1993-letter-to-shareholders.pdf` | 13 | OCR＋原页核验 | `7b8bb1d8e87757c1d164a13db2242a3d35b44fdd8d329c3d749b12fac2eca8c4` |
| [1994年 西科金融致股东信—中文全文](../../../shareholders/1994年%20西科金融致股东信—中文全文.md) | `wesco-1994-letter-to-shareholders.pdf` | 12 | OCR＋原页核验 | `c3d1425a145eb567931ac867e63b6af031e439a06dfb1cc66971f60a7edb002f` |
| [1995年 西科金融致股东信—中文全文](../../../shareholders/1995年%20西科金融致股东信—中文全文.md) | `wesco-1995-letter-to-shareholders.pdf` | 10 | OCR＋原页核验 | `de221fea01ead98b889e7f8aea4fd46f3a69753419aaccdaa3efde51e7dca290` |
| [1996年 西科金融致股东信—中文全文](../../../shareholders/1996年%20西科金融致股东信—中文全文.md) | `wesco-1996-letter-to-shareholders.pdf` | 10 | OCR＋原页核验 | `43b51b28b13ed2cc5ba550ce4a112bf1db429625474fff05265e407121b30b9f` |
| [1997年 西科金融致股东信—中文全文](../../../shareholders/1997年%20西科金融致股东信—中文全文.md) | `wesco-1997-letter-to-shareholders.pdf` | 10 | 文本层＋页面核验 | `b30c01a2311237dd5a727ef60ecbe626f871306d4576eef660201a22b0a7649f` |
| [1998年 西科金融致股东信—中文全文](../../../shareholders/1998年%20西科金融致股东信—中文全文.md) | `wesco-1998-letter-to-shareholders.pdf` | 10 | 文本层＋页面核验 | `84806e5aefc1c5fe8b632be958b43950290af92d5dc33a59d4a3bbf07367803d` |
| [1999年 西科金融致股东信—中文全文](../../../shareholders/1999年%20西科金融致股东信—中文全文.md) | `wesco-1999-letter-to-shareholders.pdf` | 8 | 文本层＋页面核验 | `cb3ca8bf0d2bafece9c258c23d507dc1193145881507cd7f82edbf13d2267848` |
| [2000年 西科金融致股东信—中文全文](../../../shareholders/2000年%20西科金融致股东信—中文全文.md) | `wesco-2000-letter-to-shareholders.pdf` | 8 | 文本层＋页面核验 | `b9112462e46b1dbac19052b611f2eaeea6151913b39afb67985114662537e1f8` |
| [2001年 西科金融致股东信—中文全文](../../../shareholders/2001年%20西科金融致股东信—中文全文.md) | `wesco-2001-letter-to-shareholders.pdf` | 9 | 文本层＋页面核验 | `51067af872122db4dc015b86d9a0f0bae97bcb78f5c245cc335c2f44be390d0e` |
| [2002年 西科金融致股东信—中文全文](../../../shareholders/2002年%20西科金融致股东信—中文全文.md) | `wesco-2002-letter-to-shareholders.pdf` | 10 | 文本层＋页面核验 | `a84667cf56fecf9cd297b9feba13c77493f005778166c018ba32897e92bcde4f` |
| [2003年 西科金融致股东信—中文全文](../../../shareholders/2003年%20西科金融致股东信—中文全文.md) | `wesco-2003-letter-to-shareholders.pdf` | 9 | 文本层＋页面核验 | `8bb17423dc8b92fe584af252f0fabca59592fd61d8df03d659611a5b898ba73a` |
| [2004年 西科金融致股东信—中文全文](../../../shareholders/2004年%20西科金融致股东信—中文全文.md) | `wesco-2004-letter-to-shareholders.pdf` | 9 | 文本层＋页面核验 | `1a4c8c52ce6ef0f8cde16846ea28526509feccc4daaf388e0992959acec58110` |
| [2005年 西科金融致股东信—中文全文](../../../shareholders/2005年%20西科金融致股东信—中文全文.md) | `wesco-2005-letter-to-shareholders.pdf` | 9 | 文本层＋页面核验 | `cc164a6e9f0e8206438a2b3d31a866cd2488f364765f8efdf604c41f0de52a28` |
| [2006年 西科金融致股东信—中文全文](../../../shareholders/2006年%20西科金融致股东信—中文全文.md) | `wesco-2006-letter-to-shareholders.pdf` | 9 | 文本层＋页面核验 | `190ed0eb36bd31aedc4742dd01d5ab95218d09e3cb7da1cdf7b4db31b79c9856` |
| [2007年 西科金融致股东信—中文全文](../../../shareholders/2007年%20西科金融致股东信—中文全文.md) | `wesco-2007-letter-to-shareholders.pdf` | 8 | 文本层＋页面核验 | `08e4e1d97b40528960907ae20066be020b892416ce44ddcede8d980bf7a01d94` |
| [2008年 西科金融致股东信—中文全文](../../../shareholders/2008年%20西科金融致股东信—中文全文.md) | `wesco-2008-letter-to-shareholders.pdf` | 9 | 文本层＋页面核验 | `678daec6437403f44ae46d12b16813a455fb18039c70457667eb4501ddf3c276` |
| [2009年 西科金融致股东信—中文全文](../../../shareholders/2009年%20西科金融致股东信—中文全文.md) | `wesco-2009-letter-to-shareholders.pdf` | 8 | 文本层＋页面核验 | `4073b3c49de7139c97da777d27b89536c00f84e80a0b63e00c46b9ec9f6f13ba` |
| [2004年 西科金融股东会记录—中文全文](../../../shareholders/2004年%20西科金融股东会记录—中文全文.md) | `2004-wesco-annual-meeting-notes-of-charlie-mungers-remarks-whitney-tilson.pdf` | 23 | 文本层＋页面核验 | `c950a9b58c0697ba0230eb362892a3241064d53b04b3853511d3c6bdbc6db2a9` |
| [2005年 西科金融股东会记录—中文全文](../../../shareholders/2005年%20西科金融股东会记录—中文全文.md) | `2005-wesco-annual-meeting-notes-of-charlie-mungers-remarks-whitney-tilson.pdf` | 30 | 文本层＋页面核验 | `f6a7accda778aac401b0041d33d56bd44a0211a7d3f9697faa8edb6ac1855b19` |
| [2006年 西科金融股东会记录—中文全文](../../../shareholders/2006年%20西科金融股东会记录—中文全文.md) | `2006-wesco-annual-meeting-notes-of-charlie-mungers-remarks-whitney-tilson.pdf` | 28 | 文本层＋页面核验 | `8c56d33de43e7007edd066ee340cf16c9b640431523ab0573e5ed2cfc0ab24c9` |
| [2008年 西科金融股东会记录—中文全文](../../../shareholders/2008年%20西科金融股东会记录—中文全文.md) | `2008-wesco-annual-meeting-notes-of-charlie-mungers-remarks-peter-boodell.pdf` | 15 | 文本层＋页面核验 | `caba1bb8252ef7653b2d84dd17fadb8f6fe49b719fd5c86afc8afba8e0a8a1c9` |
| [2009年 西科金融股东会记录—中文全文](../../../shareholders/2009年%20西科金融股东会记录—中文全文.md) | `2009-wesco-annual-meeting-notes-of-charlie-mungers-remarks-peter-boodell.pdf` | 11 | 文本层＋页面核验 | `093f45a51ab1f87f8f0662cae7d5fcad74499432e264c897974e0b3cd9dd20fd` |
| [2011年 西科合并后芒格对话会记录—中文全文](../../../shareholders/2011年%20西科合并后芒格对话会记录—中文全文.md) | `2011-wesco-annual-meeting-notes-of-charlie-mungers-remarks-the-inoculated-investor.pdf` | 16 | 文本层＋页面核验 | `1d2ed1d8c4989963aced872213c47eb03a3470e5c6d0ba6f69bcaf4b18597770` |
| [2013年 每日期刊股东会记录—中文全文](../../../shareholders/2013年%20每日期刊股东会记录—中文全文.md) | `2013-daily-journal-corp-annual-meeting-notes-of-charlie-mungers-remarks.pdf` | 29 | 文本层＋页面核验 | `5041b21db5534a351984ede2c0fde9a7bfc78326ce5d64a6d4ee2128843bd67f` |

## 原件问题及译注

- 1985 年股东信 PDF 第 11 页：股息登记日的日数在原扫描中缺失。已重新渲染确认，译文标为“原件字迹不清”，没有猜补。
- 1987 年股东信 PDF 第 5 页：原文的 6,567,000 美元与本信分项及上一年股东信的 6,967,000 美元不一致。保留本页原数，并加译注说明。
- 1989 年股东信 PDF 第 5 页提到附有退出储贷行业协会的信件副本，但用户提供的 18 页 PDF 并未包含该附件。文件中实际收录的内容已全译；缺附件情况已写入来源信息。
- 部分股东信有年份误印、重复编号、表格与正文口径或舍入不一致。译文保留原件数字、年份和编号，并在需要时注明，未凭其他年份数据替换。
- 2005 年会议原句“not want … without”与赞扬家庭互信的上下文矛盾。主文和重复附录均保留双重否定，并加译注，未静默改成相反意思。
- 2008 年会议笔记中的“25m over 18m”未提供金额口径；麦克风的“hard mike / wired”关系含混；“can just raise prices”与后文否认自动定价权存在张力。均保留原文并说明疑点。
- 2009 年会议笔记的能源成本 5% 未给出基数；“sea”、人名“Wolfenhouer”及“man who loved china, by Ogilvy”等表述按原记录保留，未用外部推测改写。
- 2011 年记录中的“Hitler’s ancestors”、88 岁及 13 家标准石油公司等措辞和数字按原文保留，必要处注明原记录表述。
- 2013 年笔记存在名称拼写不确定、缺词、异常措辞和人称跳跃。相关英文及含混提示均保留；记录者自述漏记的“missed a chunk here”也照译。原件未记下的发言未补写；身份不明的“Man 4”未擅自署为芒格。

## 独立复核

作者逐页自检后，由未撰写对应译稿的复核者逐段对照英文和中文，核对表格、脚注、数字、单位、正负号、日期与发言人。覆盖全部 34 份、436 页；发现的问题均修复并由复核者再次读取当前文件确认。

| 复核范围 | 文件数 | PDF 页数 | 结果 |
|---|---:|---:|---|
| 1983—1987 年股东信 | 5 | 48 | 通过，修复已复验 |
| 1988—1989 年股东信 | 2 | 39 | 通过，修复已复验 |
| 1990—1996 年股东信 | 7 | 81 | 通过，修复已复验 |
| 1997—2003 年股东信 | 7 | 64 | 通过，修复已复验 |
| 2004—2009 年股东信 | 6 | 52 | 通过 |
| 2004、2005、2006 年会议 | 3 | 81 | 通过，修复已复验 |
| 2008、2009、2011、2013 年会议／对话 | 4 | 71 | 通过，修复已复验 |
| 合计 | 34 | 436 | 无待修项 |

复核修正了收益是否计入的口径、分保佣金收付方向、记录者标签、警察年薪与养老金年额，以及含混原句的处理。1988 年两处 OCR 将“2½ 个百分点”误识为“2 个百分点”，已对照扫描恢复为 2.5 个百分点。1990 年原曲线图已从用户 PDF 提取并嵌入，完整保留曲线、坐标、图例和来源，配中文图注。

`casualty insurance` 的译名已明确为财产及责任保险业务，避免读作人身意外伤害险；`surplus lines` 采用明确市场类别的译法并保留英文，含义交叉核验了 [NAIC 保险术语表](https://content.naic.org/glossary-insurance-terms)。相关跨年度修复另经限定复验。

## 核验与构建

- `npm run check` 通过：内容校验、9 项 Python 引用检查测试、Astro 类型检查（0 错误、0 警告）、27 个 Vitest 测试文件中的 172 项测试，以及静态构建。
- 构建产物逐项检查了 34 个全文页面、34 个旧摘要跳转、来源链接及新增图像文件；页面显示“中文全文”和“来源信息”，旧摘要正文已移除。全文标记仍进入引用语料，摘要标记继续排除。
- 全部作者页码覆盖记录与 PDF 实际页数一致，共 436 页；34 份输入 PDF 的 SHA-256 再次核对一致，原文件未改动。
- 已抽查股东信、长篇会议全文、原曲线图及旧链接跳转。390px 手机宽度下正文没有横向溢出，宽表格在自身区域滚动；1440px 桌面宽度下表格各列正常显示。
- `git diff --check` 通过。未提交、推送或部署。

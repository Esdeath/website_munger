# 04 由关键词生成文章

本阶段只负责把已入选关键词生成 `articles/` 文章。

## 写作前

从 [`../state/keyword-registry.md`](../state/keyword-registry.md) 选一个关键词,先确定三句话:

1. 这篇文章解决读者什么问题?
2. 芒格在这个问题上的核心判断是什么?
3. 这个主题最容易被怎样误读?

没有清楚角度时不要创建文章。

## 创建文章

```bash
cp docs/article-production/reference/article-template.md "articles/关键词-副标题.md"
```

文件名包含关键词,副标题表达具体角度,不要用“深度解析”“全面解读”这类空泛词。

## 引用规则

- blockquote 必须逐字复制自 `shareholders/` 或 `speech/`。
- 每组 blockquote 必须有出处行:`——《篇名》年份`。
- 不把提问者、编者导言、第三方评论当成芒格的话。
- 引文内部如果出现会干扰脚本的 `——`,换更短的逐字片段。

## 正文规则

- 正文用第三人称解读体,不要伪装成芒格原话。
- 每节承担一个功能:定义、时间线、反面、跨学科、案例、边界、行动。
- 抽象判断必须配案例或反例。
- 脚本 PASS 只是底线;解释太薄时继续补论述、例子、误读和边界。

风格细则见 [`../reference/article-style.md`](../reference/article-style.md)。

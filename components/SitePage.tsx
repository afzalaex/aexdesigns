import { NotionRenderer } from "@/components/NotionRenderer";
import type { NotionPageData } from "@/lib/notion";

function toPageClass(slug: string): string {
  if (slug === "/") {
    return "index";
  }

  return slug.replace(/^\//, "").replace(/\//g, "-");
}

export function SitePage({ page }: { page: NotionPageData }) {
  const pageClass = toPageClass(page.slug);
  const articleId = `block-${page.id.replace(/-/g, "")}`;

  return (
    <main id={`page-${pageClass}`} className={`site-content page__${pageClass}`}>
      {page.slug === "/p5nels" ? (
        <div className="p5nels-top-actions">
          <a className="cc0" href="https://creativecommons.org/share-your-work/public-domain/cc0/">
            CC0
          </a>
          <a className="get-button" href="https://store.aex.design/l//p5nels">
            Get-Free
          </a>
        </div>
      ) : page.slug === "/typecheck" ? (
        <div className="p5nels-top-actions">
          <a
            className="mint-link"
            href="https://opensea.io/collection/typecheck"
          >
            Mint NFT
          </a>
          <a className="get-button" href="https://store.aex.design/l/typecheck">
            Get-Free
          </a>
        </div>
      ) : page.slug === "/nounty" ? (
        <div className="p5nels-top-actions">
          <a
            className="mint-link"
            href="https://opensea.io/collection/nounty-font"
          >
            Mint NFT
          </a>
          <a className="get-button" href="https://store.aex.design/l/nounty">
            Get-Free
          </a>
        </div>
      ) : page.slug === "/aexpective" ? (
        <div className="p5nels-top-actions">
          <a
            className="mint-link"
            href="https://zora.co/collect/eth:0xa2b28076129f8cb404202077f3cbda8a513b62ed"
          >
            Mint NFT
          </a>
          <a className="get-button" href="https://store.aex.design/l/aexpective">
            Get-Free
          </a>
        </div>
      ) : page.slug === "/designassetpack2" ? (
        <div className="p5nels-top-actions">
          <a className="license-one" href="https://aex.design/license-one">
            License-one
          </a>
          <a className="buy-button" href="https://store.aex.design/l/designassetpack2">
            Buy-$1
          </a>
        </div>
      ) : page.slug === "/aextract" ? (
        <div className="p5nels-top-actions">
          <a className="license-one" href="https://aex.design/license-one">
            License-one
          </a>
          <a className="buy-button" href="https://store.aex.design/l/aextract">
            Buy-$1
          </a>
        </div>
      ) : page.slug === "/aextract36" ? (
        <div className="p5nels-top-actions">
          <a className="cc0" href="https://creativecommons.org/share-your-work/public-domain/cc0/">
            CC0
          </a>
          <a className="get-button" href="https://store.aex.design/l/aextract36">
            Get-Free
          </a>
        </div>
      ) : page.slug === "/designassetpack1" ? (
        <div className="p5nels-top-actions">
          <a className="cc0" href="https://creativecommons.org/share-your-work/public-domain/cc0/">
            CC0
          </a>
          <a className="get-button" href="https://store.aex.design/l//designassetpack1">
            Get-Free
          </a>
        </div>
      ) : null}
      <div className="notion-header page">
        <div className="notion-header__cover no-cover no-icon" />
        <div className="notion-header__content max-width no-cover no-icon">
          <div className="notion-header__title-wrapper">
            <h1 className="notion-header__title">{page.title}</h1>
          </div>
          {page.description ? (
            <p className="notion-header__description">{page.description}</p>
          ) : null}
        </div>
      </div>

      <article id={articleId} className="notion-root max-width">
        <NotionRenderer blocks={page.blocks} pageSlug={page.slug} />
      </article>
    </main>
  );
}

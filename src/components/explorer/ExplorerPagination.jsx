export default function ExplorerPagination({ currentPage, totalItems, pageSize, onPageChange }) {
  const totalPages = Math.ceil(totalItems / pageSize);

  if (totalPages <= 1) return null;

  function goToPage(page) {
    onPageChange(page);

    document.getElementById("explorer")?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }

  const pageNumbers = [];

  for (let page = 0; page < totalPages; page++) {
    const isFirst = page === 0;
    const isLast = page === totalPages - 1;
    const isNearCurrent = Math.abs(page - currentPage) <= 2;

    if (isFirst || isLast || isNearCurrent) {
      pageNumbers.push(page);
    }
  }

  const paginationItems = [];

  pageNumbers.forEach((page, index) => {
    const previousPage = pageNumbers[index - 1];

    if (index > 0 && page - previousPage > 1) {
      paginationItems.push(
        <span key={`ellipsis-${page}`} className="pagination-ellipsis">
          …
        </span>,
      );
    }

    paginationItems.push(
      <button
        className={`page-number ${page === currentPage ? "active" : ""}`}
        type="button"
        key={page}
        onClick={() => goToPage(page)}
      >
        {page + 1}
      </button>,
    );
  });

  return (
    <div className="explorer-pagination">
      <button
        className="btn"
        type="button"
        disabled={currentPage === 0}
        onClick={() => goToPage(Math.max(0, currentPage - 1))}
      >
        ← Previous
      </button>

      <div className="pagination-pages">{paginationItems}</div>

      <button
        className="btn"
        type="button"
        disabled={currentPage === totalPages - 1}
        onClick={() => goToPage(Math.min(totalPages - 1, currentPage + 1))}
      >
        Next →
      </button>
    </div>
  );
}

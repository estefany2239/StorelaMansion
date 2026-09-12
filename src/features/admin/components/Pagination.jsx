import { ChevronLeft, ChevronRight } from "lucide-react";
import "./Pagination.css";

function Pagination({ currentPage, totalPages, onPageChange }) {
  const obtenerPaginas = () => {
    const MAX_VISIBLES = 5;
    const paginas = [];

    if (totalPages <= MAX_VISIBLES) {
      for (let i = 1; i <= totalPages; i += 1) {
        paginas.push(i);
      }
      return paginas;
    }

    const inicio = Math.max(2, currentPage - 1);
    const fin = Math.min(totalPages - 1, currentPage + 1);

    paginas.push(1);

    if (inicio > 2) {
      paginas.push("...");
    }

    for (let i = inicio; i <= fin; i += 1) {
      paginas.push(i);
    }

    if (fin < totalPages - 1) {
      paginas.push("...");
    }

    paginas.push(totalPages);

    return paginas;
  };

  return (
    <nav className="pagination" aria-label="Paginación de tabla">

      <button
        type="button"
        className="pagination-button"
        aria-label="Página anterior"
        disabled={currentPage <= 1}
        onClick={() => onPageChange(currentPage - 1)}
      >
        <ChevronLeft size={18} />
      </button>

      <div className="pagination-pages">

        {obtenerPaginas().map((item, index) =>
          item === "..." ? (
            <span
              key={`pagination-ellipsis-${index}`}
              className="pagination-ellipsis"
            >
              ...
            </span>
          ) : (
            <button
              key={item}
              type="button"
              className={`pagination-number ${
                item === currentPage ? "active" : ""
              }`}
              aria-current={
                item === currentPage ? "page" : undefined
              }
              onClick={() => onPageChange(item)}
            >
              {item}
            </button>
          )
        )}

      </div>

      <button
        type="button"
        className="pagination-button"
        aria-label="Página siguiente"
        disabled={currentPage >= totalPages}
        onClick={() => onPageChange(currentPage + 1)}
      >
        <ChevronRight size={18} />
      </button>

    </nav>
  );
}

export default Pagination;
function Error({ statusCode }: { statusCode?: number }) {
  return (
    <div style={{ padding: "2rem", textAlign: "center" }}>
      <h1>{statusCode ? `Erro ${statusCode}` : "Ocorreu um erro"}</h1>
    </div>
  );
}

Error.getInitialProps = ({ res, err }: { res?: { statusCode: number }; err?: { statusCode: number } }) => {
  const statusCode = res ? res.statusCode : err ? err.statusCode : 404;
  return { statusCode };
};

export default Error;

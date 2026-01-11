export function Banner() {
    return <div className="container mt-2 p-4 w-100 w-md-75 w-lg-50 text-center">
        <img className="m-auto" src={`${process.env.NEXT_PUBLIC_BASE_PATH}/stjiris-banner.png`} alt="STJIRIS Banner" />
    </div>
}

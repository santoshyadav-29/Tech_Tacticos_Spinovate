import Image from 'next/image';

export default function GuidePage() {
    return (
        <div className="w-full">
            <div className="relative w-full h-[400vh]">
                <Image
                    src="/Guide.jpg"
                    alt="Guide"
                    fill
                    style={{ objectFit: 'contain', objectPosition: 'top center' }}
                    priority
                />
            </div>
        </div>
    );
}
